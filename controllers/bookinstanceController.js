const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

// Display list of all BookInstances.
exports.bookinstance_list = asyncHandler(async (req, res, next) => {
	const allBookInstances = await BookInstance.find().populate('book').exec();

	res.render('bookinstance_list', {
		title: 'Book Instance List',
		bookinstance_list: allBookInstances,
	});
});

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
	const bookInstance = await BookInstance.findById(req.params.id)
		.populate('book')
		.exec();

	if (bookInstance === null) {
		// No results.
		const err = new Error('Book copy not found');
		err.status = 404;
		return next(err);
	}

	res.render('bookinstance_detail', {
		title: 'Book',
		bookinstance: bookInstance,
	});
});

// Display BookInstance create form on GET.
exports.bookinstance_create_get = asyncHandler(async (req, res, next) => {
	const books = await Book.find({}, 'title').sort({ title: 1 }).exec();
	res.render('bookinstance_form', {
		title: 'Create Book Instance',
		books: books,
	});
});

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
	// Validate and sanitize fields.
	body('book', 'Book must be specified.')
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body('imprint', 'Imprint must be specified.')
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body('status').escape(),
	body('due_back', 'Invalid due back date.').custom((value, { req }) => {
		const status = req.body.status;
		if (status === 'Available' && value) {
			throw new Error(
				'Due back date should not be provided when the book is available.'
			);
		}

		if (status !== 'Available' && !value) {
			throw new Error(
				'Due back date is required when the book is not available.'
			);
		}

		// Check if the due_back date is provided and is a valid ISO8601 date
		if (value && !Date.parse(value)) {
			throw new Error('Invalid due back date.');
		}

		return true;
	}),

	// Process request after validation and sanitization.
	asyncHandler(async (req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a BookInstance object with escaped and trimmed data.
		const bookInstance = new BookInstance({
			book: req.body.book,
			imprint: req.body.imprint,
			status: req.body.status,
			due_back: req.body.due_back,
		});

		if (!errors.isEmpty()) {
			// There are errors. Render form again with sanitized values/error messages.

			// Get all books for form.
			const books = await Book.find({}, 'title')
				.sort({ title: 1 })
				.exec();
			console.log(books);

			res.render('bookinstance_form', {
				title: 'Create Book Instance',
				books: books,
				book_instance: bookInstance,
				errors: errors.array(),
			});
		} else {
			// Data from form is valid. Save book.
			await bookInstance.save();
			res.redirect(bookInstance.url);
		}
	}),
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) => {
	// Get details of book instance
	const bookInstance = await BookInstance.findById(req.params.id).exec();

	if (bookInstance === null) {
		// No results.
		res.redirect('/catalog/bookinstances');
	}

	res.render('bookinstance_delete', {
		title: 'Delete Book Instance',
		book_instance: bookInstance,
	});
});

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
	// Get details of book instance
	const bookInstance = await BookInstance.findById(req.params.id)
		.populate('book')
		.exec();

	if (!bookInstance) {
		res.redirect('/catalog/bookinstances');
	} else {
		await BookInstance.findByIdAndDelete(req.body.bookinstanceid);
		res.redirect('/catalog/bookinstances');
	}
});
