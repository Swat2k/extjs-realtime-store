/**
 * Данный провайдер {@link App.direct.wsDirectProvider wsDirectProvider} предоставляет доступ
 * к серверным методам на клиенте посредством RPC запросов.
 * 
 * Важные моменты: 
 *  1) Вызвать RPC функцию можно тремя путями
 *      а) Через model & store (для модели метод save, для стора метод sync)
 *      б) Через прямой вызов смапленой функции 
 *         Пример: Direct.meta_test.sleep.sleep_at({sleep_seconds: 10}) (есть и поддержка калбеков, контекстов и прочих плюшек) см PLM.direct.wsRemotingMethod
 *      в) Сырым запросом (смотри как авторизовывается провайдер)
 */

Ext.define('App.direct.wsDirectProvider', {
    extend: 'Ext.direct.JsonProvider',
    alias: 'direct.wsprovider',

    type: 'ws',

    id: 'App.direct.wsDirectProvider',

    requires: [
        'Ext.util.MixedCollection',
        'Ext.util.DelayedTask',
        'App.direct.wsTransaction',
        'App.direct.wsExceptionEvent',
        'App.direct.wsRemotingMethod',
        'Ext.direct.RemotingMethod',
        'Ext.direct.Manager'
    ],

    /**
     * @cfg {String} url
     *
     * url для соединения посредством WebSocket
     */
    url: '',

    /**
     * @cfg {Object} client
     *
     * Текущий инстанс SockJS
     */
    client: null,

    /**
     * @cfg {String} namespace
     *
     * Корневой путь для маппинга функций текущего провайдера
     */
    namespace: 'Direct',

    /**
     * @cfg {Number/Boolean} [enableBuffer=10]
     *
     * `true` или `false` для включения или выключения механизма обьединения запросов в пачки
     * Если указано число, тогда определяет время (ms) ожидания для отсылки батча
     */
    enableBuffer: false,

    /**
     * @cfg {Number} bufferLimit Максимальное количество запросов которое может быть в батче
     * Эта опция ничего не значит, если {@link #enableBuffer} `false`.
     */
    bufferLimit: Number.MAX_VALUE,

    /**
     * @cfg {String} Токен авторизации участвующий в каждом запросе.
     */
    token: null,

    /**
     * @cfg {Number} connectCount Число попыток соединения
     */
    connectCount: 0,

    constructor: function (config) {
        var me = this;

        me.callParent(arguments);

        // Создаем корневой namespace
        me.namespace = (Ext.isString(me.namespace)) ? Ext.ns(me.namespace) : me.namespace || Ext.global;

        // Создаем буфер вызовов (необходим для обьединения запросов)
        me.callBuffer = [];
    },

    destroy: function () {
        var me = this;

        if (me.callTask) {
            me.callTask.cancel();
        }

        Ext.direct.Manager.removeProvider(me);
        me.clearListeners();
        me.client.close();
        Ext.destroy(me.client);
        me.client = null;
        me.callParent();
    },

    connect: function () {
        var me = this;

        // Создаем the SockJS client и подписываемся на события
        if (me.client)
            me.client.close();

        me.client = new WebSocket(me.url);
        me.client.onopen = Ext.bind(me.onOpenConnection, me);
        me.client.onmessage = Ext.bind(me.onData, me);
        me.client.onclose = Ext.bind(me.onCloseConnection, me);
    },

    // Эта функция может вызываться вручную
    disconnect: function () {
        var me = this;
        me.connectCount = 0;
        me.client.close();
    },

    // Мы генерируем событие disconnect только при реальной потере связи 
    onCloseConnection: function () {
        var me = this;
        me.fireEventArgs('disconnect', [me]);
    },

    onOpenConnection: function () {
        var me = this;

        me.connectCount++;

        try {
            me.apiCreated = false;

            let metaFrame = {
                    method: "meta",
                    provider: me,
                    disableBatching: true,
                    callback: function (result, response, transaction, options) {
                        if (transaction.status) {
                            me.initAPI(result);
                            me.apiCreated = true;
                            me.fireEventArgs(me.connectCount > 1 ? 'reconnect' : 'connect', [me]);
                        } else {
                            me.disconnect(true); // force
                        }
                    }
                },
                metaTransaction = new App.direct.wsTransaction(metaFrame);
            metaTransaction.send();

        } catch (e) {
            me.disconnect(true); // force
        }

    },

    getNamespace: function (root, action) {
        var parts = action.toString().split('.'),
            ns, i, len;

        for (i = 0, len = parts.length; i < len; i++) {
            ns = parts[i];
            root = root[ns];

            if (typeof root === 'undefined') {
                return root;
            }
        }

        return root;
    },

    createNamespaces: function (root, action) {
        var parts, ns, i, len;

        root = root || Ext.global;
        parts = action.toString().split('.');

        for (i = 0, len = parts.length; i < len; i++) {
            ns = parts[i];

            if (!Ext.isEmpty(ns)) {
                root[ns] = root[ns] || {};
                root = root[ns];
            }
        }

        return root;
    },

    /**
     * Маппинг RPC функций на клиенте
     *
     * @private
     */
    initAPI: function (meta) {
        var me = this,
            namespace = me.namespace,
            Manager = Ext.direct.Manager,
            cls, handler;

        for (let remoteMethod of meta) {

            // Из имени удаленного метода необходимо сформировать action и method
            // method - это справа на лево до первой точки
            // action - все остальное
            let splitMethodAndAction = remoteMethod.method,
                method = splitMethodAndAction.split('.').slice(-1)[0],
                action = splitMethodAndAction.split('.').reverse().slice(1).reverse().join('.');

            cls = me.createNamespaces(namespace, action);

            method = new App.direct.wsRemotingMethod({
                name: method,
                params: remoteMethod.params
            });

            cls[method.name] = handler = me.createHandler(action, method);

            Manager.registerMethod(handler.$name, handler);
        }
    },


    /**
     * Создаем обработчик вызова для каждой удаленной функции
     *
     * @param {String} action 
     * @param {Object} method 
     *
     * @return {Function} Обработчик
     *
     * @private
     */
    createHandler: function (action, method) {
        var me = this,
            handler;

        handler = function () {
            return me.invokeFunction(action, method, Array.prototype.slice.call(arguments, 0));
        };

        handler.name = handler.$name = Ext.isEmpty(action) ? method.name : (action + '.' + method.name);
        handler.$directFn = true;

        handler.directCfg = handler.$directCfg = {
            action: action,
            method: method
        };

        return handler;
    },

    /**
     * Вызов RPC функции на беке
     *
     * @param {String} action 
     * @param {Object} method 
     * @param {Object} args 
     *
     * @return {Object} Транзакция
     * 
     * @private
     */
    invokeFunction: function (action, method, args) {
        var me = this,
            transaction;

        transaction = me.configureTransaction(action, method, args);

        if (me.fireEvent('beforecall', me, transaction, method) !== false) {
            me.queueTransaction(transaction);
            me.fireEvent('call', me, transaction, method);
        }
        return transaction;
    },

    /**
     * Создаем и конфигурируем транзакцию на основе аргументов
     *
     * @param {String} action
     * @param {Object} method 
     * @param {Array} args 
     *
     * @return {Object} Транзакция
     *
     * @private
     */
    configureTransaction: function (action, method, args) {
        var data, cb, scope, options, params;

        data = method.getCallData(args);

        cb = data.callback;
        scope = data.scope;
        options = data.options;
        cb = cb && scope ? cb.bind(scope) : cb;

        params = Ext.apply({}, {
            provider: this,
            args: args,
            method: Ext.isEmpty(action) ? method.name : (action + '.' + method.name),
            metadata: data.metadata,
            data: data.data,
            callbackOptions: options,
            callback: cb,
            disableBatching: method.disableBatching
        });

        if (options && options.timeout != null) {
            params.timeout = options.timeout;
        }

        return new App.direct.wsTransaction(params);
    },

    /**
     * Добавляем новую транзакцию в очередь
     *
     * @param {App.direct.wsTransaction} transaction Транзакция для добавления в очередь
     *
     * @private
     */
    queueTransaction: function (transaction) {
        var me = this,
            callBuffer = me.callBuffer,
            enableBuffer = me.enableBuffer;

        Ext.direct.Manager.addTransaction(transaction);

        if (enableBuffer === false || transaction.disableBatching) {
            me.sendTransaction(transaction);
            return;
        }

        callBuffer.push(transaction);

        if (enableBuffer && callBuffer.length < me.bufferLimit) {
            if (!me.callTask) {
                me.callTask = new Ext.util.DelayedTask(me.combineAndSend, me);
            }
            me.callTask.delay(Ext.isNumber(enableBuffer) ? enableBuffer : 10);
        } else {
            me.combineAndSend();
        }
    },

    /**
     * Собираем пачку транзакций
     *
     * @private
     */
    combineAndSend: function () {
        var me = this,
            buffer = me.callBuffer,
            len = buffer.length;

        if (len > 0) {
            me.sendTransaction(len === 1 ? buffer[0] : buffer);
            me.callBuffer = [];
        }
    },

    /**
     * Отправка транзакции на бек-енд
     *
     * @param {Object/Array} transaction Транзакции для отправки на бек
     *
     * @private
     */
    sendTransaction: function (transaction) {
        var me = this,
            callData,
            payload, i, len;

        if (Ext.isArray(transaction)) {
            callData = [];
            for (i = 0, len = transaction.length; i < len; ++i) {
                payload = transaction[i].getPayload();
                callData.push(payload);
            }
        } else {
            callData = transaction.getPayload();
        }

        console.info(`%cwsRPC[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][${transaction.method}][request]`, 'background: #999aa9; color: #ffffff;', Ext.clone(callData));

        me.client.send(Ext.encode(callData));
    },


    /**
     * Рассматриваем ответы от бекенда
     *
     * @private
     */
    onData: function (e) {
        var me = this,
            response = Ext.decode(e.data),
            transaction = me.getTransaction(response.id);

        // Косяк бэка
        if ('id' in response && Ext.isEmpty(response.id)) {
            console.warn(`%cwsRPC[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][WARN]`, 'background: #e35a5a; color: #ffffff;', response);
        }
        
        // Если это запрос на исполнение нотификации на фронте
        if (response.method && !('id' in response)) {
            console.info(`%cwsRPC[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][notification]`, 'background: #999aa9; color: #ffffff;', response);
            Ext.direct.Manager.fireEvent(response.method, response.params);
        }

        if (me.destroying || me.destroyed || !transaction) {
            return;
        }

        // Если произошло исключение
        if (response.error && !Ext.isEmpty(response.error)) {
            me.exceptionReceived(response, transaction);
        } else if (response.result.errors && !Ext.isEmpty(response.result.errors)) {
            // Если пришел результат совместно с ошибкой #2832
            me.resultWithError(response, transaction);
        } else {
            // Если пришел результат исполнения запроса
            me.resultReceived(response, transaction);
        }

        // Удаляем транзакцию
        Ext.direct.Manager.removeTransaction(me.getTransaction(response.id));
    },

    exceptionReceived: function (response, transaction) {
        var me = this,
            exception = new App.direct.wsExceptionEvent({
                data: null,
                transaction: transaction,
                code: response.error.code,
                message: response.error.message
            });

        transaction.status = false; // spoof
        response.status = false;
        transaction.result = response;

        console.warn(`%cwsRPC[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][${transaction.method}][exception]`, 'background: #e35a5a; color: #ffffff;', transaction.data, response);

        me.fireEvent('data', me, exception);
        me.fireEvent('exception', me, exception);

        if (me.fireEvent('beforecallback', me, response, transaction) !== false) {
            me.runCallback(transaction, response, false);
        }
    },

    // Fix: by #2832
    resultWithError: function (response, transaction) {
        var me = this;
        // Ошибки выводим на экран
        response.result.errors.map(error => {
            me.fireEvent('exception', me, new App.direct.wsExceptionEvent({
                data: null,
                transaction: transaction,
                code: null,
                message: error.message
            }));
            console.warn(`%cwsRPC[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][${transaction.method}][exception]`, 'background: #e35a5a; color: #ffffff;', error.message, error);
        });
        // Успешный ответ проходит дальше
        if (response.result.data && !Ext.isEmpty(response.result.data)) {
            me.resultReceived(response, transaction);
        } else {
            if (me.fireEvent('beforecallback', me, response, transaction) !== false) {
                me.runCallback(transaction, response, false);
            }
        }
    },

    resultReceived: function (response, transaction) {
        var me = this;

        transaction.status = true; // spoof
        response.status = true;
        transaction.result = response;

        let time = new Date(),
            type = Ext.Date.SECOND;
        if (!Ext.Date.diff(transaction.create_dt, time, type)) {
            type = Ext.Date.MILLI;
        }
        let diff = Ext.Date.diff(transaction.create_dt, time, type);

        console.info(`%cwsRPC[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][${transaction.method}][response]`, 'background: #999aa9; color: #000000;', `${diff}${type}`, Ext.clone(response));

        me.fireEvent('data', me, response);
        if (me.fireEvent('beforecallback', me, response, transaction) !== false) {
            me.runCallback(transaction, response, true);
        }
    },

    /**
     * Получить транзакцию по UUID.
     * 
     * @return {App.direct.wsTransaction} Транзакция или null (если не найдена)
     */
    getTransaction: function (uuid) {
        return uuid ? Ext.direct.Manager.getTransaction(uuid) : null;
    },

    /**
     * Запускаем любые callbacks связанные с транзакцией.
     *
     * @param {App.direct.wsTransaction} transaction The transaction
     * @param {String} event success or failure для обратной совместимости
     *
     */
    runCallback: function (transaction, response, success) {
        var funcName = success ? 'success' : 'failure',
            callback, options, result;

        if (transaction && transaction.callback) {
            callback = transaction.callback,
                options = transaction.callbackOptions;
            result = typeof response.result !== 'undefined' ? response.result : response.data;

            if (Ext.isFunction(callback)) {
                callback(result, response, transaction, options);
            } else {
                Ext.callback(callback[funcName], callback.scope, [result, response, transaction, options]);
                Ext.callback(callback.callback, callback.scope, [result, response, transaction, options]);
            }
        }
    }
});