
module.exports = function (grunt) {
	// load all grunt tasks
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
		clean : {
            build: ['dist/*', '!dist/.git*']
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
                browser: 'PhantomJS'
			}
		},
        browserify: {
            build: {
                options: {
                    browserifyOptions: {
                        debug: true
                    }
                },
                files: {
                    'dist/<%= pkg.name %>.js': ['src/*.js']
                }
            }
        },
		uglify : {
			build : {
				files: {
                    'dist/<%= pkg.name %>.min.js': ['dist/<%= pkg.name %>.js']
                }
			}
		}
	});

	grunt.registerTask('test', [
        'jshint',
        'karma:unit'
    ]);

	grunt.registerTask('build', [
        'clean:build',
        'test',
        'browserify:build',
        'uglify:build'
    ]);

	grunt.registerTask('default', ['build']);
};
