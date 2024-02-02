DROP DATABASE IF EXISTS `film_review`;
CREATE DATABASE `film_review`; 
USE `film_review`;

-- TABLES --
CREATE TABLE IF NOT EXISTS`film_review`.`users`(
	`id`			int 		 NOT NULL auto_increment,
    `username` 		varchar(128) NOT NULL,
    `email` 		varchar(128) NOT NULL UNIQUE,
    `isAdmin`		tinyint		 NOT NULL DEFAULT 0,
    `passwordHash` 	varchar(256) NOT NULL,
    `salt`			varchar(128) NOT NULL,
    PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `film_review`.`movies`(
	`numSerie` 		char(8) 	 NOT NULL,
    `title`  		varchar(255) NOT NULL,
    `genre` 		varchar(128) NOT NULL,
    `releaseDate`	date 		 NOT NULL DEFAULT(current_date()),
    `producer`		varchar(128) NOT NULL,
	PRIMARY KEY(`numSerie`),
    CHECK(length(`numSerie`) = 8) 
);

CREATE TABLE IF NOT EXISTS `film_review`.`rating`(
	`user_id`		int			 NOT NULL,
    `numSerie`		char(8) 	 NOT NULL,
    `rating`		int 		 NOT NULL,
    PRIMARY KEY(`user_id`,`numSerie`)
);

CREATE TABLE IF NOT EXISTS `film_review`.`review`(
	`review_id`		int			 NOT NULL auto_increment,
	`user_id`		int			 NOT NULL,
    `numSerie`		char(8) 	 NOT NULL,
    `review`		varchar(256) NOT NULL,
    `postDate`		datetime	 NOT NULL DEFAULT NOW(),
    PRIMARY KEY(`review_id`,`user_id`,`numSerie`)
);


-- FOREIGN KEYS --
ALTER TABLE `film_review`.`rating`
ADD CONSTRAINT FK_rating_userID
FOREIGN KEY (user_id) REFERENCES `film_review`.`users`(id) ON DELETE CASCADE;

ALTER TABLE `film_review`.`rating`
ADD CONSTRAINT FK_rating_numSerie
FOREIGN KEY (numSerie) REFERENCES `film_review`.`movies`(numSerie) ON DELETE CASCADE;

ALTER TABLE `film_review`.`review`
ADD CONSTRAINT FK_review_userID
FOREIGN KEY (user_id) REFERENCES `film_review`.`users`(id) ON DELETE CASCADE;

ALTER TABLE `film_review`.`review`
ADD CONSTRAINT FK_review_numSerie
FOREIGN KEY (numSerie) REFERENCES `film_review`.`movies`(numSerie) ON DELETE CASCADE;


-- USER DEFINED FUNCTIONS --
-- gets number of reviews per user
DELIMITER $$
CREATE FUNCTION udfGetUserReviewsNUM(userid int)
RETURNS int
DETERMINISTIC
BEGIN
	DECLARE reviewnumber int;
    SET reviewnumber = 0;
	SELECT count(*) INTO reviewnumber FROM review JOIN users ON review.user_id = users.id WHERE review.user_id = userid;
	RETURN reviewnumber;
END$$
DELIMITER ;

-- gets average rating of all movies per user 
DELIMITER $$
CREATE FUNCTION udfGetAvgRatingUser(userid int)
RETURNS int
DETERMINISTIC
BEGIN
	DECLARE avgRating int;
    SET avgRating = 0;
	SELECT avg(rating) INTO avgRating FROM rating JOIN users ON rating.user_id = users.id WHERE rating.user_id = userid;
	RETURN avgRating;
END$$
DELIMITER ;

-- gets average rating of a movie
DELIMITER $$
CREATE FUNCTION udfGetAvgRatingMovie(nSerie char(8))
RETURNS DOUBLE(5,1)
DETERMINISTIC
BEGIN
	DECLARE avgRating DOUBLE(5,1);
    SET avgRating = 0;
	SELECT avg(rating) INTO avgRating FROM rating JOIN movies ON rating.numSerie = movies.numSerie WHERE rating.numSerie = nSerie;
	RETURN avgRating;
END$$
DELIMITER ;

-- gets number of reviews per movie
DELIMITER $$
CREATE FUNCTION udfGetMovieReviewsNUM(nSerie char(8))
RETURNS int
DETERMINISTIC
BEGIN
	DECLARE numReviews int;
    SET numReviews = 0;
	SELECT count(*) INTO numReviews FROM review JOIN movies ON review.numSerie = movies.numSerie WHERE review.numSerie = nSerie;
	RETURN numReviews;
END$$
DELIMITER ;

-- gets number of ratings per movie
DELIMITER $$
CREATE FUNCTION udfGetMovieRatingsNUM(nSerie char(8))
RETURNS int
DETERMINISTIC
BEGIN
	DECLARE numRatings int;
    SET numRatings = 0;
	SELECT count(*) INTO numRatings FROM rating JOIN movies ON rating.numSerie = movies.numSerie WHERE rating.numSerie = nSerie;
	RETURN numRatings;
END$$
DELIMITER ;

-- gets user rating of movie 
DELIMITER $$
CREATE FUNCTION udfGetMovieRatingUser(MvnumSerie char(8), userid int)
RETURNS int
DETERMINISTIC
BEGIN
	DECLARE mvRate int;
    SET mvRate = 0;
	SELECT rating INTO mvRate FROM rating WHERE numSerie=MvnumSerie AND user_id = userid;
	RETURN mvRate;
END$$
DELIMITER ;


-- STORED PROCEDURES -- 
-- gets details about movie reviews
DELIMITER $$
CREATE PROCEDURE spGetMovieReviewsDetails(nSerie char(8))
BEGIN
	SELECT username, review, postDate FROM users JOIN review JOIN movies ON users.id = review.user_id AND movies.numSerie = review.numSerie WHERE movies.numSerie = nSerie;
END $$
DELIMITER ;


-- POPULATE DATABASE WITH INFORMATION-- THESE ACCOUNTS CANNOT NOT BE USED FOR LOGIN TESTING --
INSERT INTO `film_review`.`users` (username, email, isAdmin, passwordHash, salt)
VALUES ("Bernardo Bento","nardoben@mail.com",0,"password", "22");

INSERT INTO `film_review`.`users` (username, email, isAdmin, passwordHash, salt)
VALUES ("Gonçalo Neves","goncas@mail.com",0,"wordpass", "33");


INSERT INTO `film_review`.`movies` (numSerie, title, genre, releaseDate, producer)
VALUES ("AH5D6DLV","Avengers: Endgame","Action", "2019-04-22", "Kevin Feige" );

INSERT INTO `film_review`.`movies` (numSerie, title, genre, releaseDate, producer)
VALUES ("HJA89D0D","Halloween Kills","Horror", "2021-09-08", "David Gordon Green" );

INSERT INTO `film_review`.`movies` (numSerie, title, genre, releaseDate, producer)
VALUES ("89D12CC3","Batman","Adventure", "1989-06-19", "Tim Burton" );

INSERT INTO `film_review`.`movies` (numSerie, title, genre, releaseDate, producer)
VALUES ("PL153KKD","Dune","Sci-Fi", "2021-09-03", "Denis Villeneuve" );


INSERT INTO `film_review`.`rating` (user_id, numSerie, rating)
VALUES (1,"AH5D6DLV",2);

INSERT INTO `film_review`.`rating` (user_id, numSerie, rating)
VALUES (1,"HJA89D0D",4);

INSERT INTO `film_review`.`rating` (user_id, numSerie, rating)
VALUES (1,"89D12CC3",5);

INSERT INTO `film_review`.`rating` (user_id, numSerie, rating)
VALUES (2,"AH5D6DLV",5);

INSERT INTO `film_review`.`rating` (user_id, numSerie, rating)
VALUES (2,"HJA89D0D",5);

INSERT INTO `film_review`.`rating` (user_id, numSerie, rating)
VALUES (2,"89D12CC3",3);

INSERT INTO `film_review`.`rating` (user_id, numSerie, rating)
VALUES (2,"PL153KKD",4);


INSERT INTO `film_review`.`review` (user_id, numSerie, review)
VALUES (1,"AH5D6DLV","Just another avengers movie :/");

INSERT INTO `film_review`.`review` (user_id, numSerie, review)
VALUES (1,"HJA89D0D","Good family movie, my kids loved it!");

INSERT INTO `film_review`.`review` (user_id, numSerie, review)
VALUES (1,"89D12CC3","One of the classics, 10/10!!!!!");

INSERT INTO `film_review`.`review` (user_id, numSerie, review)
VALUES (2,"AH5D6DLV","Masterpiece!!!!");

INSERT INTO `film_review`.`review` (user_id, numSerie, review)
VALUES (2,"HJA89D0D","Halloween franchise awesome as ever.");

INSERT INTO `film_review`.`review` (user_id, numSerie, review)
VALUES (2,"89D12CC3","Where's the CGI?");

INSERT INTO `film_review`.`review` (user_id, numSerie, review)
VALUES (2,"PL153KKD","Nice movie!");
