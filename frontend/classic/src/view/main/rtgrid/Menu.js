Ext.define('App.view.main.rtgrid.Menu', {
    extend: 'Ext.menu.Menu',
    xtype: 'realtimegrid-menu',

    items: [{
        iconCls: 'x-fa fa-trash',
        text: 'Delete record',
        handler: 'onDeleteRecord'
    }]

});