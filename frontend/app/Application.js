Ext.define('App.Application', {
    extend: 'Ext.app.Application',

    name: 'App',

    quickTips: false,
    platformConfig: {
        desktop: {
            quickTips: true
        }
    },

    storesToCreate: [
        'App.store.Authors'
    ],

    /**
     * @cfg {Object} splashscreen 
     * Анимашка загрузки
     */
    splashscreen: {},

    onAppUpdate: function () {
        Ext.Msg.confirm('Application Update', 'This application has an update, reload?',
            function (choice) {
                if (choice === 'yes') {
                    window.location.reload();
                }
            }
        );
    },

    launch: function () {
        let me = this;

        Ext.ariaWarn = Ext.emptyFn;

        Utils.setSplashScreen('Application', 'Connecting WS ...');

        Ext.direct.Manager.addProvider({
            type: 'ws',
            url: Settings.getPath().WS,
        }).on({
            connect: async function () {
                console.info(`%cDIRECT[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][open]`, 'background: #57aafc; color: #ffffff;');

                Utils.setSplashScreen('Application', 'Starting...');

                // Создадим глобальные сторы, но только после старта direct провайдера
                for(let store of me.storesToCreate) {
                    Ext.create(store);
                }

                // Говорим беку о каких сторах мы хотим получать нотификации
                await me.updateRTStores();

                // Создаем наш viewport
                Ext.create('App.view.main.Main');

                // Скрываем splash scren загрузки
                me.hideSplashScreen();
            },
            disconnect: function (provider) {
                console.info(`%cDIRECT[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][disconnect]`, 'background: #e35a5a; color: #ffffff;');
                Utils.setSplashScreen('Application', 'Disconnected, attemping reconnect...');
                Ext.defer(function () {
                    provider.connect();
                }, Settings.getInterval().DIRECTRECONNECT);
            },
            reconnect: async function () {
                console.info(`%cDIRECT[${Ext.Date.format(new Date(), 'Y-m-d H:i:s')}][reconnect]`, 'background: #ff9833; color: #ffffff;');
                await me.updateRTStores();
                me.hideSplashScreen();
            }
        });


    },

    privates: {
        hideSplashScreen: function () {
            // Скрываем splash scren загрузки
            this.splashscreen.fadeOut({
                duration: 450,
                remove: true
            });
        },
        updateRTStores: function () {
            let deferred = new Ext.Deferred();

            Direct.global_ref_watch({
                storeIds: Ext.StoreManager.getRange().filter(x => x.isRealTimeStore).map(x => x.storeId)
            }, {
                success: function() {
                    deferred.resolve();
                },
                failure: function() {
                    Ext.defer(function () {
                        window.location.reload();
                    }, Settings.getInterval().RTSTORE_WINDOW_RELOAD);
                }
            });

            return deferred.promise;
        }
    }
});