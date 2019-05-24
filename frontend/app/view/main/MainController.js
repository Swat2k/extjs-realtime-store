Ext.define('App.view.main.MainController', {
    extend: 'Ext.app.ViewController',

    alias: 'controller.main',

    onItemContextMenu: function (grid, record, item, index, e) {
        let menu_grid = Ext.create('App.view.main.rtgrid.Menu', {
                record: record
            }),
            position = [e.getX() - 10, e.getY() - 10];
        e.stopEvent();
        menu_grid.showAt(position);
    },

    onDeleteRecord: function (menuItem) {
        menuItem.findParentByType('realtimegrid-menu').record.erase();
    }

});