(function(global){
  'use strict';

  function makeError(code,message){
    var error = new Error(message || code);
    error.code = code;
    return error;
  }
  function validatedHttpsUrl(value){
    var raw = String(value == null ? '' : value).trim();
    if (!raw) throw makeError('external_url_empty','external_url_empty');
    try {
      var parsed = new URL(raw);
      if (parsed.protocol !== 'https:' || !parsed.hostname) throw makeError('external_url_invalid','external_url_invalid');
    } catch (error) {
      if (error && /^external_url_/.test(String(error.code || ''))) throw error;
      throw makeError('external_url_invalid','external_url_invalid');
    }
    return raw;
  }
  function nativePlatform(){
    try {
      var c = global.Capacitor;
      if (!c || typeof c.getPlatform !== 'function') return '';
      var p = String(c.getPlatform() || '').toLowerCase();
      if (p !== 'ios' && p !== 'android') return '';
      if (typeof c.isNativePlatform === 'function' && !c.isNativePlatform()) return '';
      return p;
    } catch (_) { return ''; }
  }
  function nativeLauncher(){
    var c = global.Capacitor;
    if (!c) return null;
    if (c.Plugins && c.Plugins.AppLauncher) return c.Plugins.AppLauncher;
    if (typeof c.registerPlugin === 'function') return c.registerPlugin('AppLauncher');
    return null;
  }
  async function open(url){
    var safeUrl = validatedHttpsUrl(url);
    if (nativePlatform()) {
      var launcher = nativeLauncher();
      if (!launcher || typeof launcher.openUrl !== 'function') throw makeError('external_browser_plugin_missing','external_browser_plugin_missing');
      var result = await launcher.openUrl({url:safeUrl});
      if (!result || result.completed !== true) throw makeError('external_browser_open_failed','external_browser_open_failed');
      return {mode:'native',url:safeUrl,completed:true};
    }
    if (!global.document || !global.document.body || typeof global.document.createElement !== 'function') throw makeError('external_browser_unavailable','external_browser_unavailable');
    var link = global.document.createElement('a');
    link.href = safeUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    global.document.body.appendChild(link);
    link.click();
    link.remove();
    return {mode:'web',url:safeUrl,completed:true};
  }

  global.ExternalBrowser = {open:open,validatedHttpsUrl:validatedHttpsUrl};
})(window);
