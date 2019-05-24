/**
 * @class App.direct.wsTransaction
 * @author Dmitry Kazarin <dikazarin@gmail.com>
 **/

Ext.define('App.direct.data.rtStore', {
    extend: 'Ext.data.Store',
    alias: 'store.rtdirect',

    isRealTimeStore: true,

    constructor: function(config) {
        let me = this,
            ret = me.callParent([config]);

        Ext.direct.Manager.on({
            [`${me.storeId}.update`] : function(data) {
                let id = me.getModel().getIdFromData(data),
                    record = me.getById(id);

                if (record) {
                    record.set(data, {
                        commit: true
                    })
                }
            },
            [`${me.storeId}.delete`] : function(ids) {
                // Наверное тут логично использовать trackRemoved
                // Если просто приостанавливать события, то такое удаление
                // не возможно будет отследить явно, а это может понадобится в ряде случаев
                let trackRemoved = me.getTrackRemoved();
                me.setTrackRemoved(false);

                for(let id of ids) {
                    let record = me.getById(id);
                    if (record) {
                        me.remove(record);
                    }
                }
                me.setTrackRemoved(trackRemoved);
            }
        });

        return ret;
    }

});