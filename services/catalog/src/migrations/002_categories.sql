CREATE TABLE categories (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(60) NOT NULL
);

INSERT INTO categories (code, name) VALUES
    ('CONCERT', 'Concert'),
    ('COMEDY', 'Comedy'),
    ('MOVIE', 'Movie'),
    ('SPORTS', 'Sports'),
    ('THEATRE', 'Theatre');

ALTER TABLE events
    ADD CONSTRAINT fk_events_category FOREIGN KEY (category) REFERENCES categories(code);