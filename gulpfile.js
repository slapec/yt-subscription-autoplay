/*jslint node: true*/
'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

gulp.task('lint', function(){
    gulp.src(['gulpfile.js', 'src/yt-subscription-autoplay.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

gulp.task('minify', function(){
   gulp.src('src/yt-subscription-autoplay.js')
       .pipe(uglify())
       .pipe(rename('yt-subscription-autoplay.min.js'))
       .pipe(gulp.dest('dist'));
});

gulp.task('default', ['lint', 'minify']);