/**
 * @class App.direct.wsExceptionEvent
 * @author Dmitry Kazarin <dikazarin@gmail.com>
 **/

Ext.define('App.direct.wsExceptionEvent', {
    extend: 'Ext.direct.RemotingEvent',
    alias: 'direct.wsexception',

    status: false,

    constructor: function(config) {
        Ext.toast({
            title: `Server Error (code ${Ext.isEmpty(config.code) ? 'Unknow' :  config.code})`,
            html: config.message,
            width: 200,
            align: 't',
            timeout: 3000
        });
        this.callParent(arguments);
    }
});