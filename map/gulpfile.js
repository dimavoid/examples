const gulp = require('gulp'),
    sass = require('gulp-sass'),
    plumber = require("gulp-plumber"),
    csso = require('gulp-csso'),
    postcss = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    rename = require('gulp-rename'),
    browserSync = require('browser-sync'),
    del = require('del');

gulp.task('sass', () => {
  return gulp.src('sass/style.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(postcss([ autoprefixer() ]))
    .pipe(csso())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest('css'))
    .pipe(browserSync.reload({stream: true}))
});

gulp.task('browser-sync', () => {
  browserSync({
    server: {
        baseDir: '.'
    },
    notify: false
  });
});

gulp.task('watch', ['browser-sync', 'sass'], () => {
  gulp.watch('sass/**/*.scss', ['sass']);
  gulp.watch('*.html', browserSync.reload);
  gulp.watch('js/**/*.js', browserSync.reload);
});

gulp.task('clean', () => {
  return del.sync('dist');
});

gulp.task('build', ['clean', 'sass'], () => {
  const buildCss = gulp.src('css/style.min.css')
    .pipe(gulp.dest('dist/css'))

  const buildJs = gulp.src('js/**/*')
    .pipe(gulp.dest('dist/js'))

  const buildHtml = gulp.src('*.html')
    .pipe(gulp.dest('dist'));
});