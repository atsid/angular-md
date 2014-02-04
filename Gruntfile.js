'use strict';

module.exports = function (grunt) {
	// load all grunt tasks
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	// configurable paths
	var yeomanConfig = {
		app : 'app',
		dist : 'dist'
	};

	try {
		yeomanConfig.app = require('./bower.json').appPath || yeomanConfig.app;
	} catch (e) {}

	grunt.initConfig({
		yeoman : yeomanConfig,
        pkg: grunt.file.readJSON('package.json'),
		watch : {
			livereload : {
				files : [
					'{,*/}*.html',
                    'src/**/*.js',
                    'bower_components/**/*.js'
				],
				tasks : ['livereload']
			}
		},
		connect : {
			options : {
				port : 9000,
                livereload: 35729,
				hostname : '0.0.0.0',
                keepalive: true
			},
			proxies : [{
                context : '/api',
                host : 'localhost',
                port : 9001,
                rewrite: {
                    '^/api': '/api'
                }
            }],
            livereload: {
                options: {
                    open: true,
                    base: '',
                    middleware: function (connect) {
                        return [
                            require('grunt-connect-proxy/lib/utils').proxyRequest,
                            connect.static(require('path').resolve(''))
                        ];
                    }
                }
            },
            dist : {
                options : {
                    middleware : function (connect) {
                        return [
                            proxySnippet,
                            mountFolder(connect, yeomanConfig.dist)
                        ];
                    },
                    keepalive: true
                }
            },
			test : {
				options : {
					middleware : function (connect) {
						return [
							mountFolder(connect, '.tmp'),
							mountFolder(connect, 'test')
						];
					}
				}
			},
		},
		open : {
			server : {
				url : 'http://localhost:<%= connect.options.port %>'
			}
		},
		clean : {
			dist : {
				files : [{
                    dot : true,
                    src : [
                        '.tmp',
                        'dist/*',
                        '!dist/.git*'
                    ]
                }]
			},
			server : '.tmp'
		},
		jshint : {
			options : {
				jshintrc : '.jshintrc'
			},
			all : [
                //'Gruntfile.js',
                'src/*.js',
                '!bower_components/**/*.js',
                'test/spec/{,*/}*.js'
			]
		},
		karma : {
			unit : {
				configFile : 'karma.unit.conf.js',
				singleRun : true
			}
            // cucumber : {
            //     configFile : 'karma.cucumber.conf.js',
            //     singleRun : true
            // }
		},
		concat : {
            options: {

            },
			dist : {
				src: [
                    'src/namedError.js',
                    'src/eventable.js',
                    'src/store.js',
                    'src/httpStore.js',
                    'src/arrayStore.js',
                    'src/data.js',
                    'src/itemCollection.js'
                ],
                dest: 'dist/<%= pkg.name %>.js'
			}
		},
		ngmin : {
			dist : {
				files : [{
                    expand : true,
                    cwd : 'dist',
                    src : '<%= concat.dist.dest %>.js'
                }]
			}
		},
		uglify : {
			dist : {
				files: {
                    'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
                }
			}
		}
	});

	grunt.registerTask('server', function (target) {
		if (target === 'dist') {
			return grunt.task.run(['configureProxies', 'connect:dist:keepalive']);
		}

		grunt.task.run([
            'clean:server',
            'configureProxies',
            'jshint',
            'connect:livereload',
            'watch'
        ]);
	});

	grunt.registerTask('test', [
        'clean:server',
        'karma:unit'
    ]);

	grunt.registerTask('build', [
        'clean:dist',
        'jshint',
        'test',
        'concat',
        'ngmin',
        'uglify'
    ]);

	grunt.registerTask('default', ['build']);
};
