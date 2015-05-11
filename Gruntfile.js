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

    
    // Concatenate all Extrovert modules into a single file containing the
    // Almond.js shim (so clients don't have to have require.js to use the
    // library) and a custom prefix and suffix.
    
    // requirejs-almond: {
      // // Common options
      // options: {
        // baseUrl: "src",
        // include: [ 'core' ],
        // paths: {
          // 'three': '../.tmp/three:',
          // 'physijs': '../.tmp/physi'
        // },
         // wrap: {
          // startFile: 'src/start.frag',
          // endFile: 'src/end.frag'
        // },
        // name: '../bower_components/almond/almond',
        // // Option 1: Load the normal non-AMD THREE.js build and set cjsTranslate to true here.
        // // Option 2: Load the AMD version of THREE.js and omit cjsTranslate.
        // // THREE.js does not need to be shim'd in either configuration.
        // cjsTranslate: true,
      // },    
      // annotated: {
        // options: {
          // optimize: 'none',
          // out: 'dist/extrovert.js'
        // }
      // }
    // },
    
    requirejs: {
      annotated: {
        options: {
          out: 'dist/extrovert.js',
          baseUrl: 'src',
          paths: {
            'extrovert': './extrovert',
            'three': '../bower_components/threejs/build/three',
            'physijs': '../bower_components/physijs/physi'
          },
          shim: {
            'three': { exports: 'THREE' },
            'physijs': { exports: 'Physijs' }
          },
          include: ['../bower_components/almond/almond', 'extrovert'],
          exclude: ['three'],
          wrap: {
            startFile: 'src/extrovert/start.frag',
            endFile: 'src/extrovert/end.frag'
          },
          optimize: 'none'
        }
      }
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

    copy: {
      // Copy third-party JS to a temp folder prior to Require.js processing
      thirdparty: {
        files: [{
          expand: true, flatten: true,
          src: ['bower_components/threejs/build/three.js',
                'bower_components/physijs/physi.js',
                'bower_components/ammo.js/builds/ammo.js'],
          dest: '.tmp'
        }]
      },
      physijs: {
        files: [{
          expand: true,
          flatten: true,
          src: ['bower_components/physijs/physijs_worker.js', 'bower_components/ammo.js/builds/ammo.js'],
          dest: 'dist'
        }]
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


    // comments: {
      // main: {
        // // Target-specific file lists and/or options go here.
        // options: {
          // singleline: true,
          // multiline: true
        // },
        // src: [ 'dist/<%= pkg.name %>.js' ] // files to remove comments from
      // }
    // },


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
        expr: true,
        newcap: false
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
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-requirejs');


  var cfgs = {
    debug: ['clean', 'jshint', 'copy:thirdparty', 'requirejs', 'copy:physijs', 'clean:temp'],
    release: ['clean', 'jshint', 'copy:thirdparty', 'requirejs', 'copy:physijs', 'uglify:dist', 'compress:main', 'copy:rename', 'clean:temp'],
    quick: ['clean','jshint','concat','copy:physijs','uglify:dist','clean:temp'],
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
  //

  grunt.registerTask('build', 'Build the Extrovert library.', function( config, quick ) {
    config = config || 'release';
    grunt.task.run( cfgs[config] );
  });

  grunt.registerTask('default', cfgs.release);
  grunt.registerTask('test', cfgs.test );
  grunt.registerTask('testmanual', cfgs.textmanual);
};
