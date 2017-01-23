var module = module;
//this keeps the module file from doing anything inside the jasmine tests.
//We could avoid this by making all the source be in a specific directory, but that would break backwards compatibility.
if (module) {
    module.exports = function (grunt) {
        'use strict';
        require('grunt');

        var config, debug, environment, spec, port;
        grunt.loadNpmTasks('grunt-contrib-jasmine');
        grunt.loadNpmTasks('grunt-contrib-jshint');
        grunt.loadNpmTasks('grunt-contrib-connect');

        grunt.registerTask('test', ['jshint', 'jasmine']);
        grunt.registerTask('default', ['test']);
        grunt.registerTask('test:debug', ['jasmine:app:build', 'connect']);

        spec = grunt.option('spec') || '*';
        port = grunt.option('port') || 7357;
        debug = grunt.option('debug') || false;
        config = grunt.file.readJSON('config.json');

        config.js_files = grunt.file.expand(['src/javascript/utils/*.js','src/javascript/rules/*.js','src/javascript/*.js']);

        config.js_contents = " ";
        for (var i=0;i<config.js_files.length;i++) {
            grunt.log.writeln( config.js_files[i]);
            config.js_contents = config.js_contents + "\n" + grunt.file.read(config.js_files[i]);
        }
    
        grunt.initConfig({
            pkg: grunt.file.readJSON('package.json'),
            
            template: {
                dev: {
                    src: 'templates/App-debug.html',
                    dest: 'App-debug.html',
                    engine: 'underscore',
                    variables: config
                },
            },
            
            watch: {
                files: ['src/javascript/**/*.js', 'src/style/*.css'],
                tasks: ['deploy']
            },

            jasmine: {
                app: {
                    src: 'src/**/*.js',
                    options: {
                        styles: config.css,
                        vendor:[
                          'node_modules/rally-sdk2-test-utils/src/sdk/' + config.sdk + '/sdk-debug.js',
                          'node_modules/rally-sdk2-test-utils/dist/sdk2-test-utils.js'
                        ],
                        template: 'node_modules/rally-sdk2-test-utils/lib/specs.tmpl',
                        specs: "test/**/" + spec + "Spec.js",
                        keepRunner: true
                    }
                }
            },

            jshint: {
                all: ['test/**/*.js']
            },

        });

    //load
    grunt.loadNpmTasks('grunt-templater');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-watch');
    
    //tasks
    grunt.registerTask('default', ['debug','build','ugly','apikey']);
    
    // (uses all the files in src/javascript)
    grunt.registerTask('build', "Create the html for deployment",['template:dev']);
    };
 
}
