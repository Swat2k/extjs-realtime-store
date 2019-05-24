/**
 * @class App.components.plugins.preloader.Preloader
 * @author Dmitry Kazarin <dikazarin@gmail.com>
 **/

Ext.define('App.components.plugins.preloader.Preloader', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.preloader',

    config: {
        deltaY: 200,
        spinner: true,
        loadingText: 'Loading...'
    },

    preloaderSpec: {
        tag: 'div',
        cls: 'preloader-wrap',
        children: [{
            tag: 'div',
            cls: 'x-mi mi-spinner preloader'
        }]
    },

    preloaderEl: null,

    isAllLoaded: false,

    init: function (cmp) {
        let me = this,
            store = cmp.getStore(),
            view = me.getView();

        view.loadMask = false;

        me.processView(view);

        // Эта структура может быть модифицирована, в зависимости от используемого компонента (dataview or grid)
        // Мы же не хотим что бы эта структура было общей для всех плагинов?
        me.preloaderSpec = Ext.clone(me.preloaderSpec);

        // Добавим обработчики к store
        if ('store' in (cmp.getBind() || {})) {
            cmp.setStore = Ext.Function.createSequence(cmp.setStore, me.processStore, me);
        } else if (store) {
            me.processStore(store);
        } else {
            Ext.raise(`plugin.preloader -> unable to determine store`)
        }
    },

    /**
     * @method processStore
     * @param {Object} Store Store
     */
    processStore: function (store) {
        let me = this,
            view = me.getView();

        me.isAllLoaded = false;

        store.on({
            beforeload: function (store, operation) {
                if (operation.getPage() === 1) {
                    if (view.loadingText) {
                        view.setLoading(view.loadingText);
                    }
                    me.isAllLoaded = false;
                } else {
                    view.setLoading(false);
                }
            },
            load: function () {
                view.setLoading(false);
            }
        })
    },

    processView: function (view) {
        let me = this;
        if (!view.hasListener('lazyProccess')) {
            view.on({
                scroll: function () {
                    view.fireEvent('lazyProccess');
                },
                lazyProccess: function () {
                    let store = me.getCmp().getStore(),
                        scrollable = view.getScrollable(),
                        maxPosition = scrollable ? scrollable.getMaxPosition() : null;

                    if (!scrollable || !maxPosition || maxPosition.y === 0) {
                        return;
                    }

                    if (view.isVisible(true) && maxPosition.y - scrollable.getPosition().y < me.getDeltaY() && !me.isAllLoaded && !store.hasPendingLoad()) {

                        if (me.getSpinner()) {
                            if (me.isGrid()) {
                                me.preloaderSpec.style = 'position:fixed;bottom:0;';
                            } else {
                                if (view.refreshNeeded) {
                                    view.refresh();
                                }
                            }
                            me.preloaderEl = view.getEl().appendChild(me.preloaderSpec);
                        }

                        store.nextPage({
                            addRecords: true,
                            callback: function (records, operation, success) {
                                if (success) {
                                    if (!operation.getRecords().length) {
                                        me.isAllLoaded = true;
                                    }
                                }
                                me.destoryPreloader();
                            }
                        });
                    }
                },
                scope: this
            });
        }
    },

    privates: {
        destoryPreloader: function () {
            let me = this;
            if (me.preloaderEl) {
                me.preloaderEl.destroy();
                me.preloaderEl = null;
            }
        },
        // Возвращает view компонента
        getView: function () {
            let me = this,
                cmp = me.getCmp();

            // Поддержка grid'a
            if (me.isGrid()) {
                return cmp.getView();
            } else if (me.isDataView()) {
                return cmp;
            } else {
                Ext.raise(`plugin.preloader -> getView() -> unsupported component`);
            }
        },
        isDataView: function () {
            return this.getCmp().getXTypes().split('/').includes('dataview');
        },
        isGrid: function () {
            return this.getCmp().getXTypes().split('/').includes('grid');
        }
    }
});