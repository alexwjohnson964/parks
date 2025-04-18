INSERT INTO users (username, password)
  VALUES ('admin', '$2b$10$M7dQ415qTIY1erjRJ/DpluwtpwxTG.ZR4tDB44VvM3qLhT2xPillG'),
         ('new_user', '$2b$10$/3moavVVce7OVH/J3q5bFuYcECdohZX/u3wLnnSESa31xlh.hB1zC');
         
UPDATE users
  SET password = '$2b$10$M7dQ415qTIY1erjRJ/DpluwtpwxTG.ZR4tDB44VvM3qLhT2xPillG'
  WHERE username = 'admin';
UPDATE users
  SET password = '$2b$10$/3moavVVce7OVH/J3q5bFuYcECdohZX/u3wLnnSESa31xlh.hB1zC'
  WHERE username = 'new_user';