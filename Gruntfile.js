/*jslint node: true*/
'use strict';

module.exports = function(grunt){
    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            gruntfile: {
                src: 'Gruntfile.js'
            },
            build: {
                src: 'src/yt-subscription-autoplay.js'
            }
        },
        uglify: {
            build: {
                src: 'src/yt-subscription-autoplay.js',
                dest: 'dist/yt-subscription-autoplay.min.js'
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.registerTask('default', ['jshint', 'uglify']);
};