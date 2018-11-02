(function($){
  
  $.topics = {'dfObj': {}};
    /**
     *    Events.publish
     *    e.g.: Events.publish("/Article/added", [article], this);
     *
     *    @class Events
     *    @method publish
     *    @param topic {String}
     *    @param args    {Array}
     *    @param scope {Object=} Optional
     */
    $.publish = function (topic, args, /** {Object=} */ scope) {
//        console.log('publish', topic);
        
        var topicFns = $.topics[topic];
        if (topicFns && topicFns.length > 0) {
            var i = topicFns.length - 1;
            var o = $.topics['dfObj'];
            for (i ; i >= 0 ; i -= 1) {
                topicFns[i].apply(scope || o, args || []);
            }
        }
    };
    /**
     *    Events.subscribe
     *    e.g.: Events.subscribe("/Article/added", Articles.validate)
     *
     *    @class Events
     *    @method subscribe
     *    @param topic {String}
     *    @param fn {Function}
     *    @return Event handler {Array}
     */
    $.subscribe = function (topic, fn) {
//        console.log('subscribe', topic);
        
        var topicFns = $.topics[topic];
        if (!topicFns) {
          topicFns = $.topics[topic] = [];
        }
        
        topicFns.push(fn);
    };
    /**
     *    Events.unsubscribe
     *    e.g.: var fn = Events.subscribe("/Article/added", Articles.validate);
     *        Events.unsubscribe(fn);
     *
     *    @class Events
     *    @method unsubscribe
     *    @param topic {String}
     *    @param fn {Function}
     *    @return {type description }
     */
    $.unsubscribe = function (topic, fn) {
//      console.log('unsubscribe', topic);
      
        var topicFns = $.topics[topic];
        if (topicFns && topicFns.length > 0) {
          if (fn) {
            var i = topicFns.length - 1;
                for (i ; i >= 0 ; i -= 1) {
                    if (topicFns[i] === fn) {
                      topicFns.splice(i, 1);
                    }
                }
          } else {
            $.topics[topic] = null;
            delete $.topics[topic];
          }
        }
    };
})(jQuery);