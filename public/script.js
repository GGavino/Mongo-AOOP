/**
 * @file script.js
 * @description This file contains the JavaScript code for handling the frontend logic of the web application.
 * @version 1.0.0
 * @date 2024-11-20
 * @author Pedro Moreira
 * @organization ESTG-IPVC
 */

// using DOMContentLoaded
// alternatively "defer" attribute could be used in the <script> element 
// to prevent running the script before the page is loaded.

let baseUrl = 'http://localhost:3000';
let moviesApiUrl = `${baseUrl}/movies`;
let commentsApiUrl = `${baseUrl}/comments/movie`;

document.addEventListener('DOMContentLoaded', async () => {
    const moviesGrid = document.getElementById('moviesGrid');
    const pagination = document.getElementById('pagination');
    const commentsModal = document.getElementById('commentsModal');
    const commentsList = document.getElementById('commentsList');
    const closeButton = document.querySelector('.close-button');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    let currentPage = 1;
    const moviesPerPage = 20;
    let searchQuery = ''; // Store the current search query

    // Fetch the base URL from the backend
    const fetchBaseUrl = async () => {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error(`Failed to fetch base URL: ${response.statusText}`);
            }
            const config = await response.json();
            baseUrl = config.baseUrl;
        } catch (error) {
            console.error('Error fetching base URL:', error);
        }
    };

    await fetchBaseUrl();

    moviesApiUrl = `${baseUrl}/movies`;
    commentsApiUrl = `${baseUrl}/comments/movie`;

    // Fetch and display movies
    const fetchMovies = async (page = 1) => {
        try {
            const response = await fetch(`${moviesApiUrl}?page=${page}&limit=${moviesPerPage}&search=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            displayMovies(data.movies);
            setupPagination(data.totalMovies, page);
        } catch (error) {
            console.error('Error fetching movies:', error);
        }
    };

    // Display movies in a grid
    const displayMovies = (movies) => {
        moviesGrid.innerHTML = '';

        movies.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.classList.add('movie-card');

            const poster = document.createElement('img');
            poster.src = movie.poster || 'placeholder.jpg'; // Use a placeholder if no poster is available
            poster.alt = `${movie.title} Poster`;

            const title = document.createElement('h3');
            title.textContent = movie.title;

            const year = document.createElement('p');
            year.textContent = `Year: ${movie.year}`;

            const genres = document.createElement('p');
            genres.textContent = `Genres: ${movie.genres.join(', ')}`;

            const viewCommentsButton = document.createElement('button');
            viewCommentsButton.textContent = 'View Details';
            viewCommentsButton.addEventListener('click', () => fetchMovieDetails(movie._id));

            movieCard.appendChild(poster);
            movieCard.appendChild(title);
            movieCard.appendChild(year);
            movieCard.appendChild(genres);
            movieCard.appendChild(viewCommentsButton);

            moviesGrid.appendChild(movieCard);
        });
    };

    // Setup pagination
    const setupPagination = (totalMovies, currentPage) => {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(totalMovies / moviesPerPage);

        // Add "First" button
        if (currentPage > 1) {
            const firstButton = document.createElement('button');
            firstButton.textContent = 'First';
            firstButton.addEventListener('click', () => fetchMovies(1));
            pagination.appendChild(firstButton);
        }

        // Add buttons for pages two steps back
        for (let i = Math.max(1, currentPage - 2); i < currentPage; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.addEventListener('click', () => fetchMovies(i));
            pagination.appendChild(button);
        }

        // Add button for the current page
        const currentButton = document.createElement('button');
        currentButton.textContent = currentPage;
        currentButton.classList.add('active');
        pagination.appendChild(currentButton);

        // Add buttons for pages two steps forward
        for (let i = currentPage + 1; i <= Math.min(totalPages, currentPage + 2); i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.addEventListener('click', () => fetchMovies(i));
            pagination.appendChild(button);
        }

        // Add "Last" button
        if (currentPage < totalPages) {
            const lastButton = document.createElement('button');
            lastButton.textContent = 'Last';
            lastButton.addEventListener('click', () => fetchMovies(totalPages));
            pagination.appendChild(lastButton);
        }
    };
   
    // Close the modal
    const closeModal = () => {
        commentsModal.style.display = 'none';
    };

    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === commentsModal) {
            closeModal();
        }
    });

    // Add event listener to the search button
    searchButton.addEventListener('click', () => {
        searchQuery = searchInput.value.trim(); // Get the search query
        fetchMovies(1); // Fetch movies starting from the first page
    });

    // Add event listener for pressing "Enter" in the search input
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchQuery = searchInput.value.trim(); // Get the search query
            fetchMovies(1); // Fetch movies starting from the first page
        }
    });

    fetchMovies();
});

const openModal = () => {
    const commentsModal = document.getElementById('commentsModal');
    commentsModal.style.display = 'block';
};

const fetchMovieDetails = async (movieId) => {
    try {
        // Fetch movie details
        const movieResponse = await fetch(`${moviesApiUrl}/${movieId}`);
        const movie = await movieResponse.json();

        // Display movie details
        const moviePoster = document.getElementById('moviePoster');
        const movieTitle = document.getElementById('movieTitle');
        const movieDetails = document.getElementById('movieDetails');

        moviePoster.src = movie.poster || 'placeholder.jpg'; // Use a placeholder if no poster is available
        moviePoster.alt = `${movie.title} Poster`;
        movieTitle.textContent = movie.title || 'Unknown Title';
        movieDetails.innerHTML = `
            <p><strong>Year:</strong> ${movie.year || 'Unknown Year'}</p>
            <p><strong>Genres:</strong> ${movie.genres ? movie.genres.join(', ') : 'Unknown Genres'}</p>
            <p><strong>Plot:</strong> ${movie.plot || 'No plot available'}</p>
        `;

        // Fetch comments for the movie
        const commentsResponse = await fetch(`${commentsApiUrl}/${movieId}`);
        const comments = await commentsResponse.json();

        // Display comments
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const li = document.createElement('li');
            li.innerHTML = `
                <p><strong>${comment.name}:</strong></p>
                <p>${comment.text}</p>
                <div class="comment-buttons">
                    <button class="edit-button" onclick="editComment('${comment._id}', '${comment.text}', '${movieId}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-button" onclick="deleteComment('${comment._id}', '${movieId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            commentsList.appendChild(li);
        });

        // Open the modal
        openModal();

        // Handle adding a new comment
        const addCommentForm = document.getElementById('addCommentForm');
        addCommentForm.onsubmit = async (event) => {
            event.preventDefault();
            const name = document.getElementById('commentName').value;
            const text = document.getElementById('commentText').value;

            try {
                const response = await fetch(`${commentsApiUrl}/${movieId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, text }),
                });

                if (response.ok) {
                    fetchMovieDetails(movieId); // Refresh comments
                }
            } catch (error) {
                console.error('Error adding comment:', error);
            }
        };
    } catch (error) {
        console.error('Error fetching movie details:', error);
    }
};

const editComment = async (commentId, currentText, movieId) => {
    const newText = prompt('Edit your comment:', currentText);
    if (newText && newText !== currentText) {
        try {
            const response = await fetch(`${commentsApiUrl}/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newText }),
            });

            if (response.ok) {
                fetchMovieDetails(movieId); // Refresh comments after editing
            } else {
                console.error('Failed to edit comment:', response.statusText);
            }
        } catch (error) {
            console.error('Error editing comment:', error);
        }
    }
};

const deleteComment = async (commentId, movieId) => {
    if (confirm('Are you sure you want to delete this comment?')) {
        try {
            const response = await fetch(`${commentsApiUrl}/${commentId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchMovieDetails(movieId); // Refresh comments after deletion
            } else {
                console.error('Failed to delete comment:', response.statusText);
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    }
};
