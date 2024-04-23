
export default {
	input: './index.js',
	output: {
		file: './dist/bundle.js',
		format: 'es'
	},
	external: ['amqplib'],
	plugins: []
};
