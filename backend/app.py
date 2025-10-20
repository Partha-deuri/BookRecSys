import pickle
import numpy as np
import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

model_path = './models/'

# Load model artifacts
books_df = pickle.load(open(f'{model_path}books.pkl', 'rb'))
popular_df = pickle.load(open(f'{model_path}popular.pkl', 'rb'))
pivot_table = pickle.load(open(f'{model_path}pivot_table.pkl', 'rb'))
similarity_scores = pickle.load(open(f'{model_path}similarity_scores.pkl', 'rb'))
user_pivot_table = pickle.load(open(f'{model_path}user_pivot_table.pkl', 'rb'))
user_similarity_scores = pickle.load(open(f'{model_path}user_similarity_scores.pkl', 'rb'))

def get_book_details_by_title(book_titles):
    details = []
    for title in book_titles:
        book_info = books_df[books_df['Book-Title'] == title].drop_duplicates('Book-Title').to_dict('records')
        if book_info:
            details.append(book_info[0])
    return details

@app.route('/similar/<book_identifier>')
def recommend_similar(book_identifier):
    book_title = ''
    if book_identifier.isdigit() and len(book_identifier) in [10, 13]:
        title_row = books_df[books_df['ISBN'] == book_identifier]
        if title_row.empty:
            return jsonify({'error': 'Book with this ISBN not found'}), 404
        book_title = title_row['Book-Title'].iloc[0]
    else:
        book_title = book_identifier

    try:
        index = np.where(pivot_table.index == book_title)[0][0]
        similar_items = sorted(list(enumerate(similarity_scores[index])), key=lambda x: x[1], reverse=True)[1:6]
        recommended_titles = [pivot_table.index[i[0]] for i in similar_items]
        recommendations = get_book_details_by_title(recommended_titles)

        for rec in recommendations:
            rec['title'] = rec.pop('Book-Title', 'N/A')
            rec['author'] = rec.pop('Book-Author', 'N/A')
            rec['cover_url'] = rec.pop('Image-URL-M', 'N/A')

        return jsonify(recommendations)
    except IndexError:
        return jsonify({'error': f"Book '{book_title}' not found in the recommendation model."}), 404

@app.route('/recommend/<int:user_id>')
def recommend_for_user_api(user_id):
    try:
        user_index = np.where(user_pivot_table.index == user_id)[0][0]
        similar_users_indices = np.argsort(user_similarity_scores[user_index])[::-1][1:11]

        rated_by_target_user = set(user_pivot_table.columns[user_pivot_table.iloc[user_index] > 0])
        recommended_books = set()

        for similar_user_index in similar_users_indices:
            similar_user_ratings = user_pivot_table.iloc[similar_user_index]
            books_liked_by_similar_user = set(similar_user_ratings[similar_user_ratings > 4].index)
            recommended_books.update(books_liked_by_similar_user)

        final_recommendation_titles = list(recommended_books - rated_by_target_user)

        if not final_recommendation_titles:
            return jsonify({'message': 'No new recommendations found for this user.'})

        recommendation_details = get_book_details_by_title(final_recommendation_titles[:10])

        for rec in recommendation_details:
            rec['title'] = rec.pop('Book-Title', 'N/A')
            rec['author'] = rec.pop('Book-Author', 'N/A')
            rec['cover_url'] = rec.pop('Image-URL-M', 'N/A')
            rec['isbn'] = rec.pop('ISBN', '')

        return jsonify({'recommendations': recommendation_details})

    except IndexError:
        return jsonify({'error': f"User ID '{user_id}' not found among active users."}), 404

@app.route('/popular')
def get_popular_books():
    merged_popular = popular_df.merge(books_df, on='Book-Title').drop_duplicates('Book-Title')
    top_books = merged_popular.head(20)[['Book-Title', 'Book-Author', 'Image-URL-M', 'ISBN']]
    top_books.rename(columns={'Book-Title': 'title', 'Book-Author': 'author', 'Image-URL-M': 'cover'}, inplace=True)
    return jsonify(top_books.to_dict(orient='records'))

@app.route('/book/<isbn>')
def get_book_details_by_isbn(isbn):
    book_info = books_df[books_df['ISBN'] == isbn].to_dict('records')
    if not book_info:
        return jsonify({'error': 'Book not found'}), 404
    details = book_info[0]
    renamed_details = {
        'title': details.get('Book-Title'),
        'author': details.get('Book-Author'),
        'isbn': details.get('ISBN'),
        'publisher': details.get('Publisher'),
        'year_of_publication': details.get('Year-Of-Publication'),
        'cover_url': details.get('Image-URL-M')
    }
    return jsonify(renamed_details)

@app.route('/top_authors')
def get_top_authors():
    popular_with_authors = popular_df.merge(books_df, on='Book-Title').drop_duplicates('Book-Title')
    author_counts = popular_with_authors['Book-Author'].value_counts().reset_index()
    author_counts.columns = ['name', 'books_count']
    return jsonify({'authors': author_counts.head(10).to_dict(orient='records')})

@app.route('/author/<author_name>')
def get_books_by_author(author_name):
    author_books = books_df[books_df['Book-Author'] == author_name]
    if author_books.empty:
        return jsonify({'error': 'No books found for this author'}), 404

    author_books_renamed = author_books[['Book-Title', 'Book-Author', 'Image-URL-M', 'ISBN']].copy()
    author_books_renamed.rename(columns={
        'Book-Title': 'title',
        'Book-Author': 'author',
        'Image-URL-M': 'cover'
    }, inplace=True)

    return jsonify({'books': author_books_renamed.to_dict(orient='records')})

if __name__ == '__main__':
    app.run(debug=True)
