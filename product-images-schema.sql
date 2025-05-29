-- ProductImages Table Creation
-- This table stores the relationship between products and their images stored in S3
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(512) NOT NULL,
    image_key VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) DEFAULT NULL,
    display_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign key constraint linking to products table
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    -- Ensure each product has only one primary image
    UNIQUE KEY unique_primary_per_product (product_id, is_primary),
    -- Index for faster lookups
    INDEX idx_product_id (product_id),
    INDEX idx_display_order (product_id, display_order)
);
-- Example: Adding images to a product
-- Let's say we have a product with ID 1
-- Insert primary image (first image, marked as primary)
INSERT INTO product_images (
        product_id,
        image_url,
        image_key,
        alt_text,
        display_order,
        is_primary
    )
VALUES (
        1,
        'https://orsa-admin-backend-product-images-dev.s3.eu-west-3.amazonaws.com/products/12345678-1234-1234-1234-123456789abc.jpg',
        'products/12345678-1234-1234-1234-123456789abc.jpg',
        'Main product image',
        1,
        TRUE
    );
-- Insert additional images
INSERT INTO product_images (
        product_id,
        image_url,
        image_key,
        alt_text,
        display_order,
        is_primary
    )
VALUES (
        1,
        'https://orsa-admin-backend-product-images-dev.s3.eu-west-3.amazonaws.com/products/87654321-4321-4321-4321-cba987654321.jpg',
        'products/87654321-4321-4321-4321-cba987654321.jpg',
        'Product detail view',
        2,
        FALSE
    ),
    (
        1,
        'https://orsa-admin-backend-product-images-dev.s3.eu-west-3.amazonaws.com/products/11111111-2222-3333-4444-555555555555.jpg',
        'products/11111111-2222-3333-4444-555555555555.jpg',
        'Product in use',
        3,
        FALSE
    );
-- Queries for retrieving product images
-- Get all images for a specific product
SELECT pi.id,
    pi.image_url,
    pi.image_key,
    pi.alt_text,
    pi.display_order,
    pi.is_primary,
    pi.created_at
FROM product_images pi
WHERE pi.product_id = 1
ORDER BY pi.display_order ASC;
-- Get products with their primary image
SELECT p.id,
    p.name,
    p.price,
    p.description,
    pi.image_url as primary_image_url,
    pi.alt_text as primary_image_alt
FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    AND pi.is_primary = TRUE
ORDER BY p.id;
-- Get products with all their images (JSON aggregation - MySQL 5.7+)
SELECT p.id,
    p.name,
    p.price,
    p.description,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'id',
            pi.id,
            'url',
            pi.image_url,
            'key',
            pi.image_key,
            'alt_text',
            pi.alt_text,
            'display_order',
            pi.display_order,
            'is_primary',
            pi.is_primary
        )
    ) as images
FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE p.id = 1
GROUP BY p.id,
    p.name,
    p.price,
    p.description;
-- Update image display order
UPDATE product_images
SET display_order = 1
WHERE id = 2
    AND product_id = 1;
-- Set a new primary image (this will automatically unset the previous primary due to unique constraint)
UPDATE product_images
SET is_primary = FALSE
WHERE product_id = 1
    AND is_primary = TRUE;
UPDATE product_images
SET is_primary = TRUE
WHERE id = 2
    AND product_id = 1;
-- Delete an image record (the actual S3 file should be deleted via Lambda function)
DELETE FROM product_images
WHERE id = 3;
-- Count images per product
SELECT p.id,
    p.name,
    COUNT(pi.id) as image_count
FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
GROUP BY p.id,
    p.name
ORDER BY image_count DESC;
-- Examples of storing URLs vs S3 keys:
-- Option 1: Store full URL (recommended for easy frontend consumption)
-- Pros: Easy to use in frontend, includes CDN/domain info
-- Cons: Harder to change bucket/domain later, longer storage
INSERT INTO product_images (product_id, image_url, image_key)
VALUES (
        1,
        'https://orsa-admin-backend-product-images-dev.s3.eu-west-3.amazonaws.com/products/image1.jpg',
        'products/image1.jpg'
    );
-- Option 2: Store only S3 key (more flexible)
-- Pros: Shorter storage, easy to change bucket/domain, easier to manage
-- Cons: Need to construct full URL in application code
INSERT INTO product_images (product_id, image_key)
VALUES (1, 'products/image1.jpg');
-- Then construct URL in application: `https://${bucket}.s3.${region}.amazonaws.com/${key}`
-- Recommended approach: Store both for flexibility
-- This gives you the best of both worlds
INSERT INTO product_images (
        product_id,
        image_url,
        image_key,
        alt_text,
        display_order,
        is_primary
    )
VALUES (
        1,
        'https://orsa-admin-backend-product-images-dev.s3.eu-west-3.amazonaws.com/products/image1.jpg',
        'products/image1.jpg',
        'Product main image',
        1,
        TRUE
    );