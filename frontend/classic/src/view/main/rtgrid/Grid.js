Ext.define('App.view.main.rtgrid.Grid', {
    extend: 'Ext.grid.Panel',
    xtype: 'realtimegrid',

    requires: [
        'Ext.grid.plugin.CellEditing',
        'App.store.Authors',
        'App.view.main.rtgrid.Menu',
        'App.components.grid.column.RowNumberer',
        'App.components.plugins.preloader.Preloader'
    ],

    title: 'Authors',

    store: {
        type: 'authors'
    },

    plugins: {
        preloader: true,
        cellediting: {
            clicksToEdit: 1
        }
    },

    multiColumnSort: true,

    viewConfig: {
        loadMask: false,
        stripeRows: true,
        preserveScrollOnRefresh: false,
        preserveScrollOnReload: true
    },

    columns: [{
            xtype: 'absrownumberer'
        },
        {
            text: 'Identifier',
            dataIndex: 'id'
        },
        {
            text: 'First Name',
            dataIndex: 'first_name',
            editor: {
                field: {
                    xtype: 'textfield',
                    allowBlank: false
                }
            }
        },
        {
            text: 'Last Name',
            dataIndex: 'last_name',
            editor: {
                field: {
                    xtype: 'textfield',
                    allowBlank: false
                }
            },
            flex: 1
        },
        {
            xtype: 'datecolumn',
            format: 'd-m-Y',
            text: 'Birthdate',
            dataIndex: 'birthdate',
            editor: {
                ignoreNoChange: true,
                field: {
                    xtype: 'datefield',
                    format: 'd-m-Y',
                    allowBlank: false
                }
            },
            flex: 1
        }, {
            xtype: 'datecolumn',
            format: 'd-m-Y',
            text: 'Added',
            dataIndex: 'added',
            editor: {
                field: {
                    xtype: 'datefield',
                    format: 'd-m-Y',
                    allowBlank: false
                }
            },
            flex: 1
        }
    ],

    listeners: {
        itemcontextmenu: 'onItemContextMenu'
    }
});