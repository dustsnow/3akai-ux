require(
    [
    'jquery',
    'sakai/sakai.api.core',
    'qunitjs/qunit',
    '../../../../tests/qunit/js/sakai_qunit_lib.js',
    '../../../../tests/qunit/js/dev.js',
    '../../../../tests/qunit/js/devwidgets.js'
    ], function($, sakai) {

        module('JavaScript formatting');

        var doRegexTest = function(jsFile, regex, testString) {
            var match = '';
            var pass = true;
            var errorString = '';
            var count = 0;

            while ((match = regex.exec(jsFile)) !== null){
                count++;
                pass = false;
                errorString = errorString + '\n' + match;
            }

            if (pass) {
                ok(true, testString);
            } else {
                ok(false, testString + ', ' + count + ' error(s): ' + errorString);
            }
        }

        var checkJs = function(jsFile) {

            // test function declarations
            var regex = /^\s*function\s.*/gm;
            var testString = 'Use \"var <functionName> = function() {\"';
            doRegexTest(jsFile, regex, testString);

            // test opening braces
            regex = /^\s*\{.*/gm;
            testString = 'Put opening braces on the same line as the statement';
            doRegexTest(jsFile, regex, testString);

            // test literal notation
            regex = /new\s+(Object|Array|Number|String|Boolean).*/gm;
            testString = 'Use literal notation';
            doRegexTest(jsFile, regex, testString);

            regex = /[^=!]==[^=]/gm;
            testString = 'Use \"===\" instead of \"==\"';
            doRegexTest(jsFile, regex, testString);

            regex = /!=[^=]/gm;
            testString = 'Use \"!==\" instead of \"!=\"';
            doRegexTest(jsFile, regex, testString);

            regex = /^\s*const\s/gm;
            testString = 'Use \"var <ALLCAPS>\" instead of \"const\"';
            doRegexTest(jsFile, regex, testString);

            regex = /\.(live|die|bind|unbind)\(/gm;
            testString = 'Use \".on()\" and \".off()\" to attach event handlers';
            doRegexTest(jsFile, regex, testString);

            regex = /\.prototype\./gm;
            testString = 'Do not extend prototypes';
            doRegexTest(jsFile, regex, testString);

            //regex = /.{81}/gm;
            //testString = 'Limit lines to 80 characters';
            //doRegexTest(jsFile, regex, testString);

            //regex = /"/gm;
            //testString = 'Use single quotes';
            //doRegexTest(jsFile, regex, testString);

            regex = /(^|\s)(Object\.(freeze|preventExtensions|seal)|eval|with)(\s|$)/gm;
            testString = 'Evil';
            doRegexTest(jsFile, regex, testString);

            regex = /(^|\s)typeof(\s|$)/gm;
            testString = 'Use jquery or underscore for type checking';
            doRegexTest(jsFile, regex, testString);

        };

        /**
         * Check JavaScript formatting
         */
        var checkJsFormatting = function() {
            $(window).trigger('addlocalbinding.qunit.sakai');
            QUnit.start();
            for (var j = 0; j < sakai_global.qunit.allJSFiles.length; j++) {
                var urlToCheck = sakai_global.qunit.allJSFiles[j];
                (function(url) {
                    asyncTest(url, function() {
                        $.ajax({
                            dataType: 'text',
                            url: url,
                            success: function(data) {
                                // remove comments
                                data = data.replace(/(\/\*([\s\S]*?)\*\/)|(\/\/(.*)$)/gm, '');
                                checkJs(data);
                                start();
                            }
                        });
                    });
                })(urlToCheck);
            }
        };

        /**
         * Run the test
         */

        if (sakai_global.qunit && sakai_global.qunit.ready) {
            checkJsFormatting();
        } else {
            $(window).bind('ready.qunit.sakai', function() {
                checkJsFormatting();
            });
        }
    }
);
