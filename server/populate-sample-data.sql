-- Sample data population script for College Marketplace

-- Item Listings - Clothing and Accessories
INSERT INTO listings (title, description, price, condition, category, type, images, location, user_id, status)
VALUES 
('Winter Jacket - Like New', 'North Face winter jacket, barely worn. Size medium, black color.', 8000, 'Like New', 'Clothing and Accessories', 'item', ARRAY['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=500&auto=format'], 'Campus Center', 1, 'active'),
('Designer Sunglasses', 'Ray-Ban Wayfarer sunglasses. Small scratch on the left lens, otherwise good condition.', 4500, 'Good', 'Clothing and Accessories', 'item', ARRAY['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&auto=format'], 'Library', 2, 'active'),
('University Branded Hoodie', 'Official university hoodie, size large. Worn a few times but still in excellent condition.', 2500, 'Very Good', 'Clothing and Accessories', 'item', ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&auto=format'], 'Student Union', 1, 'active');

-- Item Listings - School Supplies
INSERT INTO listings (title, description, price, condition, category, type, images, location, user_id, status)
VALUES 
('Graphing Calculator - TI-84', 'Texas Instruments TI-84 Plus graphing calculator. All functions working perfectly.', 6000, 'Good', 'School Supplies', 'item', ARRAY['https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=500&auto=format'], 'Engineering Building', 2, 'active'),
('Physics Textbook - 12th Edition', 'University Physics with Modern Physics by Young and Freedman, 12th edition. No highlights or notes.', 5500, 'Very Good', 'School Supplies', 'item', ARRAY['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500&auto=format'], 'Science Hall', 1, 'active'),
('Wireless Notebook Mouse', 'Logitech M510 wireless mouse. Works perfectly, batteries included.', 1200, 'Like New', 'School Supplies', 'item', ARRAY['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format'], 'Computer Lab', 2, 'active');

-- Item Listings - Sports Equipment
INSERT INTO listings (title, description, price, condition, category, type, images, location, user_id, status)
VALUES 
('Tennis Racket - Wilson Pro', 'Wilson Pro Staff RF97 tennis racket. Used for one season, great condition.', 8500, 'Good', 'Sports Equipment', 'item', ARRAY['https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?w=500&auto=format'], 'Recreation Center', 1, 'active'),
('Basketball - Official Size', 'Spalding NBA official game basketball, slightly used but in good condition.', 2000, 'Good', 'Sports Equipment', 'item', ARRAY['https://images.unsplash.com/photo-1494199505258-5f95456d5660?w=500&auto=format'], 'Gym', 2, 'active'),
('Yoga Mat - Extra Thick', 'Extra thick 1/2 inch yoga mat with carrying strap. Purple color.', 1500, 'Like New', 'Sports Equipment', 'item', ARRAY['https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500&auto=format'], 'Fitness Center', 1, 'active');

-- Item Listings - Dining Credits
INSERT INTO listings (title, description, price, condition, category, type, images, location, user_id, status)
VALUES 
('Campus Meal Swipes - 10 Remaining', '10 meal swipes remaining on my meal plan. Can transfer to your account.', 7000, 'N/A', 'Dining Credits', 'item', ARRAY['https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=500&auto=format'], 'Dining Hall', 2, 'active'),
('Campus Cafe Gift Card - $25', 'Gift card to the campus cafe with $25 balance. Never used.', 2000, 'New', 'Dining Credits', 'item', ARRAY['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500&auto=format'], 'Student Center', 1, 'active');

-- Service Listings - Academic Services
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Math Tutoring - Calculus', 'Expert tutoring in Calculus I, II and III. I''ve been a TA for 2 years in the math department.', 2500, 'Academic Services', 'service', ARRAY['https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=500&auto=format'], 'Library or Online', 1, 'active', '2025-04-15', '1 hour sessions'),
('Essay Proofreading & Editing', 'English major offering proofreading and editing services. Quick turnaround time and thorough feedback.', 1500, 'Academic Services', 'service', ARRAY['https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500&auto=format'], 'Online', 2, 'active', '2025-04-10', '48 hour turnaround'),
('Python Programming Help', 'Computer Science senior offering help with Python programming assignments and projects.', 3000, 'Academic Services', 'service', ARRAY['https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format'], 'Computer Science Building or Online', 1, 'active', '2025-04-20', 'Flexible');

-- Service Listings - Personal Services
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Professional Headshots', 'Photography major offering professional headshots for LinkedIn, portfolios, or social media.', 4000, 'Personal Services', 'service', ARRAY['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=500&auto=format'], 'Campus Green', 2, 'active', '2025-04-25', '30 minute session'),
('Moving Help - Strong Lifter', 'Need help moving in or out of your dorm? I''m available to help lift heavy items and transport boxes.', 2500, 'Personal Services', 'service', ARRAY['https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=500&auto=format'], 'On Campus', 1, 'active', '2025-06-01', 'Hourly'),
('Haircut Services', 'Offering affordable haircuts in my dorm. I''ve been cutting hair for 3 years.', 1500, 'Personal Services', 'service', ARRAY['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format'], 'North Dorm', 2, 'active', '2025-04-18', '30-45 minutes');

-- Service Listings - Other Services
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Custom T-shirt Design', 'Graphic design student offering custom t-shirt designs for clubs, events, or personal use.', 3500, 'Other', 'service', ARRAY['https://images.unsplash.com/photo-1586187220643-c722d1ae09fe?w=500&auto=format'], 'Art Building', 1, 'active', '2025-04-22', '1 week turnaround'),
('Car Rides to Airport', 'Offering rides to the nearby airport during holidays and breaks. Reliable transportation with room for luggage.', 3000, 'Other', 'service', ARRAY['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&auto=format'], 'Campus Pickup', 2, 'active', '2025-05-15', '30-45 minute drive');

-- Experience Listings - Event Tickets
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Football Game Tickets - Home Opener', 'Two tickets to the home opener football game vs. State University. Great seats in the student section.', 6000, 'Event Tickets', 'experience', ARRAY['https://images.unsplash.com/photo-1495555687398-3f50d6e79e1e?w=500&auto=format'], 'University Stadium', 1, 'active', '2025-09-15', '3 hours'),
('Spring Concert Tickets - Front Row', 'Two front row tickets to the spring concert featuring popular indie bands.', 8000, 'Event Tickets', 'experience', ARRAY['https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=500&auto=format'], 'University Arena', 2, 'active', '2025-04-28', '4 hours');

-- Experience Listings - Sports Games
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Basketball Game - Premium Seats', 'Two premium seats for the championship basketball game. Includes free drinks and snacks.', 7500, 'Sports Games', 'experience', ARRAY['https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=500&auto=format'], 'University Arena', 1, 'active', '2025-03-20', '2.5 hours'),
('Soccer Match - Season Finale', 'One ticket to the season finale soccer match. Our team is currently ranked #2 in the conference!', 3000, 'Sports Games', 'experience', ARRAY['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=500&auto=format'], 'University Soccer Field', 2, 'active', '2025-05-05', '2 hours');

-- Experience Listings - Concerts
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Orchestra Performance - Classical Night', 'One ticket to the university orchestra''s classical night featuring works by Beethoven and Mozart.', 2500, 'Concerts', 'experience', ARRAY['https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format'], 'Performing Arts Center', 1, 'active', '2025-04-30', '2 hours'),
('Jazz Ensemble - Tribute to Miles Davis', 'Two tickets to the university jazz ensemble''s tribute concert to Miles Davis.', 3000, 'Concerts', 'experience', ARRAY['https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=500&auto=format'], 'Jazz Club on Campus', 2, 'active', '2025-05-10', '3 hours');

-- Experience Listings - Campus Events
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Spring Formal Dance Ticket', 'One ticket to the annual Spring Formal dance. Dress code is formal attire.', 5000, 'Campus Events', 'experience', ARRAY['https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=500&auto=format'], 'Grand Ballroom', 1, 'active', '2025-05-20', '4 hours'),
('Comedy Night - Stand-up Show', 'Two tickets to the comedy night featuring student comedians and a professional headliner.', 2000, 'Campus Events', 'experience', ARRAY['https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=500&auto=format'], 'Student Center Auditorium', 2, 'active', '2025-04-12', '2 hours');

-- Experience Listings - Other Experiences
INSERT INTO listings (title, description, price, category, type, images, location, user_id, status, date, duration)
VALUES 
('Campus Food Tour', 'Join me for a guided tour of the best food spots on and around campus. Includes samples at 5 locations.', 2500, 'Other', 'experience', ARRAY['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format'], 'Campus Center (Meeting Point)', 1, 'active', '2025-04-19', '3 hours'),
('Campus Ghost Tour', 'Late night ghost tour of the campus, visiting all the supposedly haunted buildings with stories of their past.', 1500, 'Other', 'experience', ARRAY['https://images.unsplash.com/photo-1414438359676-aaeec3c864ff?w=500&auto=format'], 'Old Main Building (Meeting Point)', 2, 'active', '2025-10-30', '90 minutes');