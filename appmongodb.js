const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve static files from the 'public' directory

// Enable CORS for all routes
app.use(cors());

// Enable CORS for all routes

const url = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@aoop-cluster.pmlqcgz.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority&tls=true`;
const dbName = process.env.MONGO_DB;
let db;


// Start the server
async function startServer() {
    try {
        const client = await MongoClient.connect(url, { useUnifiedTopology: true });
        db = client.db(dbName);
        console.log('Connected to MongoDB');
        console.log('Database name:', db.databaseName);
        console.log('Client:', client);
        console.log('db: ', db);

        // Middleware to dynamically set the collection based on the route
        app.use('/:collectionName', (req, res, next) => {
            const validCollections = ['movies', 'comments', 'sessions', 'theaters', 'users', 'embedded_movies'];
            const collectionName = req.params.collectionName;

            if (validCollections.includes(collectionName)) {
                req.collection = db.collection(collectionName);
                next();
            } else {
                res.status(400).send({ error: 'Invalid collection name' });
            }
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    }
}

(async () => {
    await startServer();
})();


app.get('/api/config', (req, res) => {
    res.json({ baseUrl: process.env.BASE_URL });
});

// Get paginated movies with optional search
app.get('/movies', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
        const limit = parseInt(req.query.limit) || 20; // Default to 20 movies per page
        const search = req.query.search || ''; // Search query (default is empty)

        const skip = (page - 1) * limit; // Calculate the number of documents to skip

        const moviesCollection = db.collection('movies');
        const query = search ? { title: { $regex: search, $options: 'i' } } : {}; // Case-insensitive search by title
        const totalMovies = await moviesCollection.countDocuments(query); // Get total number of matching movies
        const movies = await moviesCollection.find(query).skip(skip).limit(limit).toArray(); // Fetch paginated movies

        res.json({
            totalMovies,
            totalPages: Math.ceil(totalMovies / limit),
            currentPage: page,
            movies,
        });
    } catch (err) {
        res.status(500).send({ error: 'Failed to fetch movies', details: err.message });
    }
});


app.get('/movies/:id', async (req, res) => {
    try {
        const movieId = req.params.id;
        const movie = await db.collection('movies').findOne({ _id: new ObjectId(movieId) });
        console.log('Fetched movie:', movie); // Log the movie object
        if (movie) {
            res.json(movie);
        } else {
            res.status(404).send({ error: 'Movie not found' });
        }
    } catch (err) {
        res.status(500).send({ error: 'Failed to fetch movie', details: err.message });
    }
});
// Get all comments for a specific movie by movie ID
app.get('/comments/movie/:movieId', async (req, res) => {
    try {
        const movieId = req.params.movieId;
        const comments = await db.collection('comments').find({ movie_id: new ObjectId(movieId) }).toArray();
        res.json(comments);
    } catch (err) {
        res.status(500).send({ error: 'Failed to fetch comments', details: err.message });
    }
});

app.put('/comments/movie/:commentId', async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const { text } = req.body;

        const result = await db.collection('comments').updateOne(
            { _id: new ObjectId(commentId) }, // Convert commentId to ObjectId
            { $set: { text } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        res.json({ message: 'Comment updated successfully' });
    } catch (err) {
        res.status(500).send({ error: 'Failed to update comment', details: err.message });
    }
});

// Add a new comment for a movie
app.post('/comments/movie/:movieId', async (req, res) => {
    try {
        const movieId = req.params.movieId;
        const { name, text } = req.body;
        const result = await db.collection('comments').insertOne({
            movie_id: new ObjectId(movieId),
            name,
            text,
            date: new Date(),
        });
        res.json(result);
    } catch (err) {
        res.status(500).send({ error: 'Failed to add comment', details: err.message });
    }
});


// Delete a comment
app.delete('/comments/movie/:commentId', async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const result = await db.collection('comments').deleteOne({ _id: new ObjectId(commentId) });
        res.json(result);
    } catch (err) {
        res.status(500).send({ error: 'Failed to delete comment', details: err.message });
    }
});

// CRUD endpoints
app.use('/:collectionName', (req, res, next) => {
    console.log('Request received for collection:', req.params.collectionName);
    const validCollections = ['movies', 'comments', 'sessions', 'theaters', 'users', 'embedded_movies'];
    const collectionName = req.params.collectionName;

    if (validCollections.includes(collectionName)) {
        req.collection = db.collection(collectionName);
        next();
    } else {
        res.status(400).send({ error: 'Invalid collection name' });
    }
});

// Get all documents in a collection
app.get('/:collectionName', async (req, res) => {
    try {
        const documents = await req.collection.find().toArray();
        res.json(documents);
    } catch (err) {
        res.status(500).send({ error: 'Failed to fetch documents', details: err.message });
    }
});

// Get a document by ID
app.get('/:collectionName/:id', async (req, res) => {
    try {
        const document = await req.collectionName.findOne({ _id: new ObjectId(req.params.id) });
        if (document) {
            res.json(document);
        } else {
            res.status(404).send({ error: 'Document not found' });
        }
    } catch (err) {
        res.status(500).send({ error: 'Failed to fetch document', details: err.message });
    }
});

// Create a new document
app.post('/:collectionName', async (req, res) => {
    try {
        const document = req.body;
        const result = await req.collection.insertOne(document);
        res.json({ _id: result.insertedId, ...document });
    } catch (err) {
        res.status(500).send({ error: 'Failed to create document', details: err.message });
    }
});

// Update a document by ID
app.put('/:collectionName/:id', async (req, res) => {
    try {
        const updates = req.body;
        const result = await req.collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
        if (result.matchedCount === 1) {
            res.json({ message: 'Document updated successfully' });
        } else {
            res.status(404).send({ error: 'Document not found' });
        }
    } catch (err) {
        res.status(500).send({ error: 'Failed to update document', details: err.message });
    }
});

// Delete a document by ID
app.delete('/:collectionName/:id', async (req, res) => {
    try {
        const result = await req.collection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 1) {
            res.json({ message: 'Document deleted successfully' });
        } else {
            res.status(404).send({ error: 'Document not found' });
        }
    } catch (err) {
        res.status(500).send({ error: 'Failed to delete document', details: err.message });
    }
});

