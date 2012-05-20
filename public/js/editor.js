(function(window, $, undefined) {
    'use strict';
    /**
     * Convert the current rule set into a JSON-serializable object.
     */
    function serialize() {
        var ret = [];
        $('.rules tr.rule')
            .each(function() {
                var pat = $(this).find('.pattern')[0].value;
                var dest = $(this).find('.dest')[0].value;
                var cur = {
                    type:    $(this).find('select')[0].value,
                pattern: pat,
                dest:    dest
                };
                ret.push(cur);
            });
        return ret;
    };

    var templateCache = {};
    /**
     * Render the template with the given name into a jQuery
     * wrapped unattached DOM element.
     */
    function template(name, context) {
        var t = templateCache[name];
        if (! t) {
            var e = $('#' + name);
            if (! e.length) {
                throw 'Cannot find template with name: ' + name;
            }
            
            t = _.template(e.html());
            templateCache[name] = t;
        }

        return $(t(context));
    };
    sortbox.template = template;
    

    $('.rule .dest').live('focus', function() {
        var cell = $(this).parents('td').first();
        cell.find('.exp-status')
            .addClass('icon-folder-open')
            .removeClass('icon-folder-close');
        cell.addClass('exp-active');
    });
    
    $('.exp a[href]').live('click', function(e) {
        var path = $(this).attr('data-path');
        if (path) {
	        var input = $(this).parents('td').first().find('input');
	        input.val(path);
	        input.trigger('change');
	        input.focus();
        }
        return false;
    });

    function clearIfUnfocused(elem) {
        if (! $(elem).attr('data-focus')) {
	        $(elem).parents('td').first().removeClass('exp-active');
        }
	}

    $('.rule .dest').live('blur', function() {
        $(this).parents('td')
               .first()
               .find('.exp-status')
               .removeClass('icon-folder-open')
               .addClass('icon-folder-close');
        _.delay(clearIfUnfocused, 250, this);
    });
    
    $('input[type="text"]').live('focus', function() {
        $(this).attr('data-focus', 1);
    });

    $('input[type="text"]').live('blur', function() {
        $(this).attr('data-focus', '');
    });

    /**
     * Display the given errors to the given rule.
     * @param i the rank of the rule to add errors to
     * @param errors list of errors
     */
    function addErrors(i, errors) {
        var rule = $('.rules tr.rule').eq(i);
        console.log('errors', i, rule, errors);

        // Clear old errors
        rule.find('td').removeClass('error');
        rule.find('.msg.help-inline').remove();

        $.each(errors, function() {
            var cell = rule.find('input.' + this.field).parents('td').first();
            cell.addClass('error');
            cell.append($('<span class="msg help-inline"></span>').text(this.msg));
        });

        if (errors.length === 0) {
            rule.find('.status').addClass('icon-ok');
        } else {
            rule.find('.status').addClass('icon-remove');
        }
    };
    
    function updateActivity() {
        $('.moves').empty().append(template('moves-loading'));

        $.ajax({
            type: 'GET',
            url: '/activity',
            data: {
                'authenticityToken' : window.csrfToken
            },
            success: function(moves) {
		        var el = $('.moves');
		        el.empty()
		        if (_.isEmpty(moves)) {
		            el.append(template('moves-empty'));
		        } else {
		            el.append(template('moves-list', { moves : moves }));
		        }
            },
            error: function() {
		        $('.moves').empty().append(template('moves-error'));
            }
        });
    };
    $(updateActivity);

    function loading() {
        $('.rules .rule .status').addClass('icon-refresh')
            .addClass('spin')
            .removeClass('icon-ok')
            .removeClass('icon-remove');
    };

    function doneLoading() {
        $('.rules .rule .status').removeClass('icon-refresh').removeClass('spin');
    };


    $(document).ready(function() {
        $('.new').bind('click', function() {
            var new2 = $('.rule-template').clone();
            new2.removeClass('rule-template').addClass('rule');

            $('.new-rule-row').before(new2);
            new2.show('slow');
        });

        $('.rules .del').live('click', function() {
            $(this).parents('tr').first().hide('fast', function() { $(this).remove(); });
        });

        $('.save').live('click', function() {
            var rules = serialize();
            console.log('serialed rules', rules);
            loading();
            $.ajax({
                type: 'POST',
                url: '/rules',
                data: {
                    'rules': JSON.stringify(rules),
	                'authenticityToken' : window.csrfToken
                },
                success: function(data) {
                             var hasErrors = false,
                                 msg       = null;
                             doneLoading();
                             console.log('save success');
                             $.each(data, function(i, v) {
                                 addErrors(i, v);
                                 hasErrors = hasErrors || !! v.length;
                             });
                             if (! hasErrors) {
	                             msg = $('.save').popover({ title:   "Success!", 
                             						        content: "Your rules will run every 15 minutes.",
                             						        trigger: "manual"})
                             				     .popover('show');
	                             setTimeout(function(){
	                                msg.popover("hide");
	                             }, 2000);
	                             updateActivity();
                             }
                         },
                error: function (badRequest) {
					doneLoading();
					if (badRequest.status === 400){
						alert("You have too many rules defined, please delete a few and try again.");
					}
            	}
            });
        });

        $('.alert-created').slideDown('slow');
    });
    
    $(function() {
        $('.rule .dest').explorer();
    });
})(window, jQuery);
