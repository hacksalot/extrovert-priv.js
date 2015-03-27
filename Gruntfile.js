module.exports = function(grunt) {

   grunt.initConfig({


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
            src: ['src/extrovert.js', 'src/**/*.js', '!src/controls/f*.js', '!src/generators/gen-sample.js'],
            dest: 'dist/<%= pkg.name %>.js'
         }
      },


      uglify: {
         options: {
            banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
         },
         dist: {
            files: {
               'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
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



   });

   grunt.loadNpmTasks('grunt-contrib-uglify');
   grunt.loadNpmTasks('grunt-contrib-jshint');
   grunt.loadNpmTasks('grunt-contrib-qunit');
   grunt.loadNpmTasks('grunt-contrib-concat');
   grunt.loadNpmTasks('grunt-contrib-connect');
   grunt.registerTask('default', ['jshint', 'concat', 'uglify']);
   grunt.registerTask('test', ['default', 'connect:auto', 'qunit']);
   grunt.registerTask('testmanual', ['default', 'connect:manual']);
};
