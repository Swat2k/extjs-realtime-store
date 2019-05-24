/**
 * @class App.components.grid.column.RowNumberer
 * @author Dmitry Kazarin <dikazarin@gmail.com>
 **/

Ext.define('App.components.grid.column.RowNumberer', {
    extend: 'Ext.grid.column.RowNumberer',
    xtype: 'absrownumberer',
    text: '#',

    resizable: true,
    width: 50,

    defaultRenderer: function(value, metaData, record, rowIdx, colIdx, dataSource, view) {
        var me = this;
        if (metaData && me.rowspan) {
            metaData.tdAttr = 'rowspan="' + me.rowspan + '"';
        }
        return (record ? view.store.indexOf(record) : value - 1) + 1;
    }

});