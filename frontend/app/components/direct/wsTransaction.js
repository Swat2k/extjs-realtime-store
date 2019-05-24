/**
 * @class App.direct.wsTransaction
 * @author Dmitry Kazarin <dikazarin@gmail.com>
 **/

Ext.define('App.direct.wsTransaction', {
    alias: 'direct.wsTransaction',

    jsonrpc: "2.0",

    id: null,

    // Дата создания транзакции
    create_dt: null,

    /**
     * @cfg {Ext.direct.Provider} Провайдер используемый этой транзакцией
     */
    provider: null,

    /**
     * Создаем новую транзакцию
     * @param {Object} [config] Конфигурационный обьект
     */
    constructor: function(config) {
        var me = this;
        Ext.apply(me, config);
        me.id = (new Ext.data.identifier.Uuid()).generate();
        me.create_dt = new Date();
    },

    getPayload: function() {
        var me = this,
            payload = {
                id: me.id,
                jsonrpc: me.jsonrpc,
                method: me.method,
                params: me.data || {}
            };

        // Конвертация сортировок в понятный бекенду формат
        if (payload.params.sort_by && Ext.isArray(payload.params.sort_by)) {
            payload.params.sort_by = payload.params.sort_by.map(x => {
                return {
                    name: x.property,
                    sort: x.direction.toLowerCase()
                }
            });
        }

        // Если params пустые, нечего их отправлять
        if (payload.params && Ext.Object.isEmpty(payload.params)) {
            delete payload.params;
        }

        return payload;
    },

    send: function() {
        var me = this;
        if (me.provider) {
            me.provider.queueTransaction(me);
        }
    },

    cancel: function() {
        var me = this;
        me.params = {
            cancel_method: me.method,
            cancel_id: me.id
        };
        me.id = (new Ext.data.identifier.Uuid()).generate();
        me.disableBatching = true;
        me.method = 'cancel';
        if (me.provider) {
            me.provider.queueTransaction(me);
        }
    }
});