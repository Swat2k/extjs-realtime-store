Ext.define('App.model.Author', {
    extend: 'App.model.Base',

    requires: [
        'Ext.data.proxy.Direct'
    ],

    proxy: {
        type: 'direct',
        pageParam: '',
        batchActions: false,
        api: {
            prefix: 'Direct.authors',
            //create: 'create',
            read: 'read',
            update: 'update',
            destroy: 'delete'
        },
        reader: {
            type: 'json',
            rootProperty: 'data',
            useSimpleAccessors: true
        },
        writer: {
            type: 'json',
            allowSingle: false,
            rootProperty: 'items'
        }
    },
    idProperty: 'id',
    identifier: 'uuid',
    fields: [{
        name: 'first_name',
        type: 'string',
        allowNull: true,
        defaultValue: null
    }, {
        name: 'last_name',
        type: 'string',
        allowNull: true,
        defaultValue: null
    }, {
        name: 'birthdate',
        type: 'date',
        allowNull: true,
        defaultValue: null,
        dateFormat: 'Y-m-d'
    }, {
        name: 'added',
        type: 'date',
        allowNull: true,
        defaultValue: null,
        dateFormat: 'Y-m-d'
    }]
});