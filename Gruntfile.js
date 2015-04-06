/**
Gruntfile for the extrovert.js project.
@module Gruntfile.js
*/

module.exports = function(grunt) {

  var opts = {

    pkg: grunt.file.readJSON('package.json'),
    
    clean: {
      dist: ['dist'],
      temp: ['.tmp']
    },

    connect: {
      options: {
        hostname: 'localhost',
        port: 8000,
      },
      // Set up server for automated unit tests
      auto: {
        options: {
          base: '.'
        }
      },
      // Set up server for manual tests
      manual: {
        options: {
          base: '.',
          keepalive: true
        }
      }

    },

    concat: {
      options: {
        separator: ';'
      },
      dist: {
        sources: {
          extro: ['src/extrovert.js', 'src/**/*.js', '!src/controls/first*.js', '!src/generators/gen-sample.js'],
          deps: ['bower_components/threejs/build/three.js', 'bower_components/physijs/physi.js'],
          merged: null /* filled at runtime */
        },
        files: {
          'dist/<%= pkg.name %>.js': '<%= concat.dist.sources.extro %>',
          'dist/<%= pkg.name %>.all.js': '<%= concat.dist.sources.merged %>',
          'dist/<%= pkg.name %>.deps.js': '<%= concat.dist.sources.deps %>'
        }
      }
    },


    copy: {
      physijs: {
        files: [
        {
           expand: true,
           flatten: true,
           src: ['bower_components/physijs/physijs_worker.js'],
           dest: 'dist'
        },
        ]
      },
      rename: {
        files: [{
          expand: true,
          flatten: true,
          src: ['.tmp/gz/*.js'],
          dest: 'dist',
          rename: function( dest, src ) {
            return "dist/" + src.replace('.js', '.gz.js');
          }
        }]
      },
    },


    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['dist/<%= pkg.name %>.js'],
          'dist/<%= pkg.name %>.all.min.js': ['dist/<%= pkg.name %>.all.js'],
          'dist/<%= pkg.name %>.deps.min.js': ['dist/<%= pkg.name %>.deps.js'],
          'dist/physijs_worker.min.js': ['dist/physijs_worker.js']
        }
      }
    },


    qunit: {
      test1: {
        options: {
          urls: ['http://localhost:8000/test/auto-tests.html']
        }
      }
    },


    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js', '!src/**/Projector.js', '!src/**/CanvasRenderer.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        },
        expr: true
      }
    },


    // Create gzipped versions of JS sources.
    
    // This configuration, straight from the docs
    // (https://github.com/gruntjs/grunt-contrib-compress)
    // doesn't really work.
    // compress: {
      // main: {
        // options: { mode: 'gzip' },
        // files: [
          // { expand: true, src: ['dist/*.js'], dest: 'public/', ext: '.gz.js' }
        // ]
      // }
    // }
    
    // This configuration, also from the docs, works, 
    // but doesn't specify the file extension
    // gzip assets 1-to-1 for production
    compress: {
      main: {
        options: {
          mode: 'gzip'
        },
        expand: true,
        cwd: 'dist/',
        src: ['**/*'],
        dest: '.tmp/gz/'
      }
    }


  };

  grunt.initConfig( opts );
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-compress');

  // Fill in the .merged prop (see concat {} settings above) at runtime
  opts.concat.dist.sources.merged = opts.concat.dist.sources.deps.concat( opts.concat.dist.sources.extro );
  
  var cfgs = {
    debug: ['clean', 'jshint', 'concat', 'copy:physijs', 'uglify', 'compress:main', 'copy:rename', 'clean:temp'],
    release: ['clean', 'jshint', 'concat', 'copy:physijs', 'uglify', 'compress:main', 'copy:rename', 'clean:temp'],
    quick: ['clean','jshint','concat','copy:physijs','uglify','clean:temp'],
    test: ['default', 'connect:auto', 'qunit'],
    testmanual: ['default', 'connect:manual']
  };
  
  
  // Usage: 'grunt [action]:[configuration]:[quick]'
  //
  // [action] can be either 'build' or 'serve'.
  // [configuration] can be either 'release' or 'debug'.
  // [quick] can be either 'quick' or unspecified.
  //
  // To package a full release build, use:
  //
  //        grunt build:release
  //
  // To package and serve a quick debug build, use:
  //
  //        grunt serve:debug:quick

  grunt.registerTask('build', 'Build the Extrovert library.', function( config, quick ) {
    config = config || 'release';
    grunt.task.run( cfgs[config] );
  });

  grunt.registerTask('default', cfgs.release);
  grunt.registerTask('test', cfgs.test );
  grunt.registerTask('testmanual', cfgs.textmanual);
};
