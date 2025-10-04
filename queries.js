require('dotenv').config();
const { MongoClient } = require('mongodb');
const { insertBooksOnly } = require('./insert_books');

const uri = process.env.MongoDBAtlas_URI;
const dbName = 'plp_bookstore';
const collectionName = 'books';

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    // define db + collection
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const count = await collection.countDocuments();
    if (count === 0) {
        console.log('No books found, inserting sample books...');
        await insertBooksOnly();
}


    // Find all books
    const allBooks = await collection.find({}).toArray();
    console.log('\nAll Books:');
    console.log(allBooks);

    // Find books by a specific genre
    const genre = 'Dystopian';
    const booksByGenre = await collection.find({ genre }).toArray();
    console.log(`\nBooks in Genre "${genre}":`);
    console.log(booksByGenre);

    // find books published after a certain year
    const year = 2000;
    const booksAfterYear = await collection.find({ published_year: { $gt: year } }).toArray();
    console.log(`\nBooks Published After ${year}:`);
    console.log(booksAfterYear);

    // Update the stock status of a book by title
    const titleToUpdate = 'The Great Gatsby';
    const newStockStatus = false;
    const updateResult = await collection.updateOne({ title: titleToUpdate }, { $set: { in_stock: newStockStatus } });
    console.log(`\nUpdated Stock Status of "${titleToUpdate}":`, updateResult.modifiedCount > 0 ? 'Success' : 'No Change');

    // Update price of all books by a specific publisher
    const publisherToUpdate = 'Secker & Warburg';
    const priceIncrease = 2.00; 
    const bulkUpdateResult = await collection.updateMany({ publisher: publisherToUpdate }, { $inc: { price: priceIncrease } });
    console.log(`\nUpdated Price of Books by "${publisherToUpdate}":`, bulkUpdateResult.modifiedCount, 'books updated');    

    // update price of a single book
    const titleToUpdatePrice = '1984';
    const newPrice = 15.99;
    const priceUpdateResult = await collection.updateOne({ title: titleToUpdatePrice }, { $set: { price: newPrice } });
    console.log(`\nUpdated Price of "${titleToUpdatePrice}":`, priceUpdateResult.modifiedCount > 0 ? 'Success' : 'No Change');

    // Delete a book by title
    const titletoDelete = 'The Alchemist';
    const deleteBook = await collection.deleteOne({ title: titletoDelete})
    console.log(`\nDeleted Book "${titletoDelete}":`, deleteBook.deletedCount > 0 ? 'Success' : 'Not Found');

    // Find books that are in stock and published after a certain year
    const stockYear = 2010;
    const inStockRecentBooks = await collection.find({ in_stock: true, published_year: { $gt: stockYear } }).toArray();
    console.log(`\nBooks In Stock and Published After ${stockYear}:`);
    console.log(inStockRecentBooks);

    // Read books only selecting title, author, and price
    const selectedFieldsBooks = await collection.find({}, { projection: { title: 1, author: 1, price: 1, _id: 0 } }).toArray();
    console.log('\nBooks with Selected Fields (title, author, price):');
    console.log(selectedFieldsBooks);

    // display books by assending order of price range
    const booksByPriceAsc = await collection.find({}).sort({ price: 1 }).toArray();
    console.log('\nBooks Sorted by Price (Ascending):');
    console.log(booksByPriceAsc);

    // display books by decending order of price
    const booksByYearDesc = await collection.find({}).sort({ price: -1 }).toArray();
    console.log('\nBooks Sorted by Price (Descending):');
    console.log(booksByYearDesc);

    // use limit and skip to paginate results(e.g., 5 books per page)
    const page = 1; // Change this to get different pages
    const limit = 5;
    const skip = (page - 1) * limit;
    const paginatedBooks = await collection.find({}).skip(skip).limit(limit).toArray();
    console.log(`\nBooks - Page ${page} (Limit ${limit}):`);
    console.log(paginatedBooks);

    // calculate average price of books by genre
    const avgPriceByGenre = await collection.aggregate([
        { $group: { _id: '$genre', averagePrice: { $avg: '$price' } } }
    ]).toArray();
    console.log('\nAverage Price of Books by Genre:');
    console.log(avgPriceByGenre);

    // Author with the most books
    const authorWithMostBooks = await collection.aggregate([
        { $group: { _id: '$author', bookCount: { $sum: 1 } } },
        { $sort: { bookCount: -1 } },
        { $limit: 1 }
    ]).toArray();
    console.log('\nAuthor with the Most Books:');
    console.log(authorWithMostBooks);

    // Publication by decade and count
    const booksByDecade = await collection.aggregate([
        { $group: { 
            _id: { $concat: [ { $toString: { $multiply: [ { $floor: { $divide: ['$published_year', 10] } }, 10 ] } }, 's' ] },
            count: { $sum: 1 } 
        } },
        { $sort: { _id: 1 } }
    ]).toArray();
    console.log('\nBooks Published by Decade:');
    console.log(booksByDecade);

    // Index for all books for faster search on title and author
    await collection.createIndex({ title: 'text', author: 'text' });
    console.log('\nText Index created on title and author fields');

    // Index on publication year for range queries
    await collection.createIndex({ published_year: 1 });
    console.log('Index created on published_year field');

    // perfomace check with explain
    const explainResult = await collection.find({ published_year: { $gt: 2000 } }).explain('executionStats');
    console.log('\nQuery Execution Stats for finding books published after 2000:');
    console.log(explainResult.executionStats);

    } catch (err) {
    console.error('Error occurred:', err);
  } finally {
    await client.close();
    console.log('Connection closed');
  } 
}

seed().catch(console.error);