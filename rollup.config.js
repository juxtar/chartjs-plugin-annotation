import babel from 'rollup-plugin-babel';
import {terser} from 'rollup-plugin-terser';

export default {
    input: 'src/index.js',
    external: ['chart.js'],
    output: [
        {
            file: 'chartjs-plugin-annotation.js',
            format: 'umd',
            name: 'ChartAnnotationPlugin',
            globals: {
                'chart.js': 'ChartJS'
            }
        },
        {
            file: 'chartjs-plugin-annotation.min.js',
            format: 'umd',
            name: 'ChartAnnotationPlugin',
            globals: {
                'chart.js': 'ChartJS'
            },
            plugins: [terser()]
        }
    ],
    plugins: [babel()]
};
