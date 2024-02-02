DROP DATABASE IF EXISTS uap;
CREATE DATABASE uap;
USE uap;

-- TABLES --
CREATE TABLE IF NOT EXISTS uap.users(
	nif           	VARBINARY(255)		NOT NULL,
    username		VARBINARY(255)		NOT NULL,
    PRIMARY KEY(nif)
);

CREATE TABLE IF NOT EXISTS uap.domains(
    dns           	VARBINARY(255) 		NOT NULL,
    PRIMARY KEY(dns)
);

CREATE TABLE IF NOT EXISTS uap.accounts(
    user_nif      	VARBINARY(255)      NOT NULL,
    dns_name      	VARBINARY(255) 		NOT NULL,
    email         	VARBINARY(255) 		NOT NULL,
    passW           VARBINARY(255)	 	NOT NULL,
    PRIMARY KEY(user_nif, dns_name, email)
);


-- FOREIGN KEYS --
ALTER TABLE uap.accounts
ADD CONSTRAINT FK_accounts_userNIF
FOREIGN KEY (user_nif) REFERENCES uap.users(nif) ON DELETE CASCADE;

ALTER TABLE uap.accounts
ADD CONSTRAINT FK_accounts_dns
FOREIGN KEY (dns_name) REFERENCES uap.domains(dns) ON DELETE CASCADE;


-- STORED PROCEDURES --
DELIMITER $$
CREATE PROCEDURE CREATE_USER(IN username VARCHAR(255), IN nif VARCHAR(255), IN userKey VARCHAR(255))
BEGIN
    INSERT INTO uap.users VALUES (AES_ENCRYPT(nif, userKey), AES_ENCRYPT(username, userKey));
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE SELECT_USER(IN userKey VARCHAR(255))
BEGIN
    SELECT * FROM (SELECT CONVERT(AES_DECRYPT(username, userKey) USING utf8) AS username, CONVERT(AES_DECRYPT(nif, userKey) USING utf8) AS nif FROM uap.users) AS q1 WHERE q1.nif IS NOT NULL;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE CREATE_ACCOUNT(IN userKey VARCHAR(255), IN dns_name VARCHAR(255), IN email VARCHAR(255), IN passW VARCHAR(255))
BEGIN
    DECLARE u_nif VARCHAR(255);
    SET u_nif = (SELECT nif FROM (SELECT CONVERT(AES_DECRYPT(username, userKey) USING utf8) AS username, CONVERT(AES_DECRYPT(nif, userKey) USING utf8) AS nif FROM uap.users) AS q1 WHERE q1.nif IS NOT NULL);

    IF EXISTS(SELECT dnsN FROM (SELECT CONVERT(AES_DECRYPT(dns, userKey) USING utf8) AS dnsN FROM uap.domains) AS q1 WHERE q1.dnsN = dns_name) THEN
            INSERT INTO uap.accounts VALUES (AES_ENCRYPT(u_nif, userKey), AES_ENCRYPT(dns_name, userKey), AES_ENCRYPT(email, userKey), AES_ENCRYPT(passW, userKey));

    ELSE
        START TRANSACTION;
            INSERT INTO uap.domains VALUES (AES_ENCRYPT(dns_name, userKey));
            INSERT INTO uap.accounts VALUES (AES_ENCRYPT(u_nif, userKey), AES_ENCRYPT(dns_name, userKey), AES_ENCRYPT(email, userKey), AES_ENCRYPT(passW, userKey));
        COMMIT;
    END IF ;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE SELECT_ALL_ACCOUNTS(IN userKey VARCHAR(255))
BEGIN
    SELECT dns_name, email FROM (SELECT CONVERT(AES_DECRYPT(dns_name, userKey) USING utf8) AS dns_name, CONVERT(AES_DECRYPT(email, userKey) USING utf8) AS email FROM uap.accounts) AS q1 WHERE q1.dns_name IS NOT NULL ORDER BY dns_name;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE SELECT_SINGLE_ACCOUNT(IN userKey VARCHAR(255), IN  nif VARCHAR(225), IN  dns VARCHAR(225), IN mail varchar(225))
BEGIN
    SELECT * FROM (SELECT CONVERT(AES_DECRYPT(user_nif, userKey) USING utf8) AS user_nif, CONVERT (AES_DECRYPT(dns_name, userKey) USING utf8) AS dns_name, CONVERT(AES_DECRYPT(email, userKey) USING utf8) AS email,  CONVERT(AES_DECRYPT(passW, userKey) USING utf8) AS passW FROM uap.accounts) AS q1 WHERE q1.user_nif = nif AND q1.dns_name = dns AND q1.email = mail;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE SELECT_SINGLE_ACCOUNT_PASS(IN userKey VARCHAR(255), IN  dns VARCHAR(225), IN mail varchar(225))
BEGIN
	DECLARE u_nif VARCHAR(255);
    SET u_nif = (SELECT nif FROM (SELECT CONVERT(AES_DECRYPT(username, userKey) USING utf8) AS username, CONVERT(AES_DECRYPT(nif, userKey) USING utf8) AS nif FROM uap.users) AS q1 WHERE q1.nif IS NOT NULL);
    SELECT passW FROM (SELECT CONVERT(AES_DECRYPT(user_nif, userKey) USING utf8) AS user_nif, CONVERT (AES_DECRYPT(dns_name, userKey) USING utf8) AS dns_name, CONVERT(AES_DECRYPT(email, userKey) USING utf8) AS email,  CONVERT(AES_DECRYPT(passW, userKey) USING utf8) AS passW FROM uap.accounts) AS q1 WHERE q1.user_nif = u_nif AND q1.dns_name = dns AND q1.email = mail;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE SELECT_ALL_DNS_ACCOUNTS(IN userKey VARCHAR(255), IN  dns VARCHAR(225))
BEGIN
	DECLARE u_nif VARCHAR(255);
    SET u_nif = (SELECT nif FROM (SELECT CONVERT(AES_DECRYPT(username, userKey) USING utf8) AS username, CONVERT(AES_DECRYPT(nif, userKey) USING utf8) AS nif FROM uap.users) AS q1 WHERE q1.nif IS NOT NULL);
    SELECT dns_name, email FROM (SELECT CONVERT(AES_DECRYPT(user_nif, userKey) USING utf8) AS user_nif, CONVERT (AES_DECRYPT(dns_name, userKey) USING utf8) AS dns_name, CONVERT(AES_DECRYPT(email, userKey) USING utf8) AS email,  CONVERT(AES_DECRYPT(passW, userKey) USING utf8) AS passW FROM uap.accounts) AS q1 WHERE q1.user_nif = u_nif AND q1.dns_name = dns;
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE EDIT_ACCOUNT_INFO_PASS(IN uNif VARCHAR(255), dns VARCHAR(225), IN mail VARCHAR(255), IN pass VARCHAR(255), IN userKey VARCHAR(255))
BEGIN
    UPDATE uap.accounts
    SET email = AES_ENCRYPT(mail, userKey),
		passW = AES_ENCRYPT(pass, userKey) 
    WHERE user_nif = AES_ENCRYPT(uNif, userKey);
END $$
DELIMITER ;

DELIMITER $$
CREATE PROCEDURE EDIT_ACCOUNT_INFO_NOPASS(IN uNif VARCHAR(255), IN dns VARCHAR(225), IN mail VARCHAR(255), IN userKey VARCHAR(255))
BEGIN
    UPDATE uap.accounts
    SET email = AES_ENCRYPT(mail, userKey)
    WHERE user_nif = AES_ENCRYPT(uNif, userKey);
END $$
DELIMITER ;
