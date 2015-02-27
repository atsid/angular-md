'use strict';

module.exports = function (grunt) {
	// load all grunt tasks
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
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
                'src/*.js',
                '!bower_components/**/*.js',
                'test/spec/{,*/}*.js'
			]
		},
		karma : {
			unit : {
				configFile : 'karma.unit.conf.js',
				singleRun : true,
                browser: 'Chrome'
			}
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

	grunt.registerTask('test', [
        'clean:server',
        'karma:unit'
    ]);

	grunt.registerTask('build', [
        'clean:dist',
        'jshint',
        'test',
        'concat',
        'uglify'
    ]);

	grunt.registerTask('default', ['build']);
};
