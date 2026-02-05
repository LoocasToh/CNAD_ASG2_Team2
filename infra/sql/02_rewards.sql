CREATE TABLE IF NOT EXISTS shop_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category ENUM('hat', 'clothing', 'accessory', 'background') NOT NULL,
    price INT NOT NULL,
    image_path VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_inventory (
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES shop_items(item_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS equipped_items (
    user_id INT PRIMARY KEY,
    hat_id INT DEFAULT NULL,
    clothing_id INT DEFAULT NULL,
    accessory_id INT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);