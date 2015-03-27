module.exports = function(grunt) {

  var opts = {
  
    pkg: grunt.file.readJSON('package.json'),

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
          extro: ['src/extrovert.js', 'src/**/*.js', '!src/controls/f*.js', '!src/generators/gen-sample.js'],
          deps: ['bower_components/threejs/build/three.min.js', 'bower_components/physijs/physi.js', 'bower_components/physijs/physijs_worker.js'],
          merged: null
        },
        files: {
          'dist/<%= pkg.name %>.js': '<%= concat.dist.sources.extro %>',
          'dist/<%= pkg.name %>.all.js': '<%= concat.dist.sources.merged %>',
        }
      }
    },


    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['dist/<%= pkg.name %>.js'],
          'dist/<%= pkg.name %>.all.min.js': ['dist/<%= pkg.name %>.all.js']
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
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
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
    }
  };
   
  grunt.initConfig( opts );

  opts.concat.dist.sources.merged = opts.concat.dist.sources.deps.concat( opts.concat.dist.sources.extro );
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
  grunt.registerTask('test', ['default', 'connect:auto', 'qunit']);
  grunt.registerTask('testmanual', ['default', 'connect:manual']);
};
