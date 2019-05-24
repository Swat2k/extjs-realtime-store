/**
 * @class App.Utils
 * @author Dmitry Kazarin <dikazarin@gmail.com>
 */

Ext.define('App.Utils', {
	alternateClassName: ['Utils'],
	singleton: true,

	/* Handles Private ****************************************************************************/
	// Установка Splash Screen
	setSplashScreen: function(title = 'Application', msg = 'Loading...') {
		var me = Ext.getBody(),
			dom = me.dom,
			data = me.getData(),
			maskEl = data.maskEl,
			maskMsg;

		// Если маска есть, тогда обновим контент (если нужно) и выйдем
		if (maskEl && !maskEl.destroyed) {
			let _title = maskEl.down('.x-coresplash-title'),
				_titleHtml = _title.getHtml(),
				_message = maskEl.down('.x-coresplash-message'),
				_messageHtml = _message.getHtml();

			if (_titleHtml !== title) {
				_title.setHtml(title);
			}
			if (_messageHtml !== msg) {
				_message.setHtml(msg);
			}
			return maskEl;
		}

		var html = Settings.getSplashscreen() + '<div class="x-coresplash-title">' + title + '</div>' + '<div class="x-coresplash-message">' + msg + '</div>';

		maskEl = Ext.DomHelper.append(dom, {
			role: 'presentation',
			cls: Ext.baseCSSPrefix + 'coresplash ' + Ext.baseCSSPrefix + "border-box",
			children: {
				role: 'presentation',
				cls: Ext.baseCSSPrefix + 'coresplash-child',
				cn: {
					tag: 'div',
					role: 'presentation',
					cls: Ext.baseCSSPrefix + 'mask-msg-inner',
					cn: {
						tag: 'div',
						role: 'presentation',
						cls: Ext.baseCSSPrefix + 'coresplash-content',
						html: html || ''
					}
				}
			}
		}, true);

		maskMsg = Ext.get(maskEl.dom.firstChild);
		data.maskEl = maskEl;
		me.addCls(Ext.baseCSSPrefix + 'masked');
		maskEl.setDisplayed(true);
		if (typeof msg === 'string') {
			maskMsg.setDisplayed(true);
			maskMsg.center(me);
		} else {
			maskMsg.setDisplayed(false);
		}
		if (dom === document.body) {
			maskEl.addCls(Ext.baseCSSPrefix + 'mask-fixed');
		}
		// When masking the body, don't touch its tabbable state
		/*me.saveTabbableState({
			skipSelf: dom === document.body
		});*/
		// ie will not expand full height automatically
		if (Ext.isIE9m && dom !== document.body && me.isStyle('height', 'auto')) {
			maskEl.setSize(undefined, elHeight || me.getHeight());
		}
		App.app.splashscreen = maskEl;
		return maskEl;
    },
    
	/**
	 * @method interceptEvents
	 * Перехватывает события возникающие в компоненте, и выводит их в консоль
	 * @param {Object} component Компонент в котором необходимо отследить события
	 */
	interceptEvents: function(component) {
		Ext.util.Observable.capture(component, function(evname) {
			console.info(evname, arguments);
		});
    },
    
	/**
	 * @method interceptLayoutRun
	 * Перехватывает все события перестроения layout'ов
	 * Подробнее в https://www.sencha.com/blog/performance-optimization-for-layout-runs/
	 */
	interceptLayoutRun: function() {
		Ext.Function.interceptBefore(Ext.layout.Context.prototype, 'run', function() {
			console.info('Layout run');
			eval('debugger');
		});
    }
    
});