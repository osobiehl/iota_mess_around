DROP DATABASE IF EXISTS iota_test_db;
CREATE DATABASE iota_test_db;
USE iota_test_db;

DROP TABLE IF EXISTS sensors;
CREATE TABLE sensors(
    sensor_id INTEGER PRIMARY KEY UNIQUE AUTO_INCREMENT,
    device_eui CHAR(16) UNIQUE,
    iota_address CHAR(64) NOT NULL UNIQUE,
    iota_index VARCHAR(64)
) ENGINE=INNODB ;

DROP TABLE IF EXISTS ongoing_transactions;
CREATE TABLE ongoing_transactions(
    sensor_id    INTEGER,
    output_id CHAR(68),
    session_key BINARY(32) NOT NULL UNIQUE ,
    init_vector BINARY(16)  NOT NULL UNIQUE,
    idx BINARY(16) NOT NULL,
    number_of_samples INTEGER DEFAULT 100 , 
    current_data_count INTEGER DEFAULT 0 ,
    PRIMARY KEY (sensor_id, output_id),
    FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
) ENGINE=INNODB;


DROP TABLE IF EXISTS resolved_transactions;
CREATE TABLE resolved_transactions(
    sensor_id    INTEGER,
    output_id      CHAR(68),
    PRIMARY KEY (output_id),
    FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
) ENGINE=INNODB;