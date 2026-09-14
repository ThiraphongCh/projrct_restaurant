require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool, initDb } = require('../config/db');

// 50 authentic Thai food items with Thai + English names and descriptions
const menuItems = [
  // ---------- Appetizers (10) ----------
  {
    name: 'Tom Yum Goong (Creamy)',
    nameTh: 'ต้มยำกุ้งน้ำข้น',
    description: 'Spicy creamy shrimp soup with lemongrass, galangal, kaffir lime leaves and chili',
    descriptionTh: 'ต้มยำกุ้งน้ำข้นรสเด็ด ใส่ตะไคร้ ข่า ใบมะกรูด พริกสด',
    price: 180,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Tom_yam_kung_maenam.jpg/500px-Tom_yam_kung_maenam.jpg',
    featured: true,
  },
  {
    name: 'Tom Kha Gai',
    nameTh: 'ต้มข่าไก่',
    description: 'Chicken in coconut milk soup with galangal, lemongrass and mushrooms',
    descriptionTh: 'ต้มข่าไก่ น้ำกะทิหอมกลมกล่อม ใส่ข่า ตะไคร้ เห็ด',
    price: 160,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Flickr_preppybyday_4711943668--Tom_kha_gai.jpg/500px-Flickr_preppybyday_4711943668--Tom_kha_gai.jpg',
  },
  {
    name: 'Som Tam Thai',
    nameTh: 'ส้มตำไทย',
    description: 'Classic Thai green papaya salad with tomatoes, long beans, peanuts and dried shrimp',
    descriptionTh: 'ส้มตำไทยกรุบกรอบ ใส่ถั่วลิสง กุ้งแห้ง มะเขือเทศ',
    price: 90,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/Som_Tam_green_papaya_salad%2C_Bangkok%2C_Thailand.jpg/960px-Som_Tam_green_papaya_salad%2C_Bangkok%2C_Thailand.jpg',
    featured: true,
  },
  {
    name: 'Larb Moo',
    nameTh: 'ลาบหมู',
    description: 'Spicy minced pork salad with roasted rice powder, mint and shallots',
    descriptionTh: 'ลาบหมูรสแซ่บ ใส่ข้าวคั่ว ใบสะระแหน่ หอมแดง',
    price: 110,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/LaoFood_LarbNeua.JPG/500px-LaoFood_LarbNeua.JPG',
  },
  {
    name: 'Yum Woon Sen',
    nameTh: 'ยำวุ้นเส้น',
    description: 'Glass noodle salad with minced pork, shrimp, peanuts and spicy lime dressing',
    descriptionTh: 'ยำวุ้นเส้น หมูสับ กุ้ง ถั่วลิสง น้ำยำรสแซ่บ',
    price: 100,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Yum_woun_sen.jpg/960px-Yum_woun_sen.jpg',
  },
  {
    name: 'Tod Mun Pla',
    nameTh: 'ทอดมันปลา',
    description: 'Crispy Thai fish cakes with red curry paste and green beans, served with sweet chili sauce',
    descriptionTh: 'ทอดมันปลากรอบนอกนุ่มใน ทานคู่กับน้ำจิ้มอาจาด',
    price: 120,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Thot_Man_2018-04-13.jpg/960px-Thot_Man_2018-04-13.jpg',
  },
  {
    name: 'Fried Spring Rolls',
    nameTh: 'ปอเปี๊ยะทอด',
    description: 'Crispy fried spring rolls stuffed with vegetables and glass noodles',
    descriptionTh: 'ปอเปี๊ยะทอดกรอบ ใส้ผักและวุ้นเส้น กรอบอร่อย',
    price: 85,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Spring_Rolls_%283357696061%29.jpg/500px-Spring_Rolls_%283357696061%29.jpg',
  },
  {
    name: 'Sai Ua',
    nameTh: 'ไส้อั่ว',
    description: 'Northern Thai grilled herbal sausage with lemongrass, kaffir lime and chili',
    descriptionTh: 'ไส้อั่วเชียงใหม่ หมูย่างเครื่องหอม ตะไคร้ ใบมะกรูด',
    price: 140,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Lao_Sai_Oua.png/500px-Lao_Sai_Oua.png',
  },
  {
    name: 'Yum Talay',
    nameTh: 'ยำทะเล',
    description: 'Spicy seafood salad with squid, shrimp, mussels, lemongrass and chili',
    descriptionTh: 'ยำทะเลรวมมิตร กุ้ง ปลาหมึก หอยแมลงภู่ น้ำยำแซ่บ',
    price: 150,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Thai_Seafood_Salad_%28Yum_Talay%29_-_Aberdeen_Seafood_2025-09-08.jpg/960px-Thai_Seafood_Salad_%28Yum_Talay%29_-_Aberdeen_Seafood_2025-09-08.jpg',
  },
  {
    name: 'Moo Satay',
    nameTh: 'หมูสะเต๊ะ',
    description: 'Grilled pork satay skewers marinated in turmeric, served with peanut sauce and pickles',
    descriptionTh: 'หมูสะเต๊ะย่างหอมเครื่องขมิ้น ทานคู่กับน้ำจิ้มถั่วและอาจาด',
    price: 130,
    category: 'appetizer',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Sate_Udang.JPG/500px-Sate_Udang.JPG',
  },

  // ---------- Main Courses (25) ----------
  {
    name: 'Shrimp Pad Thai',
    nameTh: 'ผัดไทยกุ้งสด',
    description: 'Stir-fried rice noodles with fresh shrimp, tofu, bean sprouts and tamarind sauce',
    descriptionTh: 'ผัดไทยกุ้งสด เส้นนุ่ม ปรุงรสด้วยซอสมะขาม ถั่วงอก ไข่',
    price: 150,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Phat_Thai_kung_Chang_Khien_street_stall.jpg/500px-Phat_Thai_kung_Chang_Khien_street_stall.jpg',
    featured: true,
  },
  {
    name: 'Chicken Basil Stir-fry',
    nameTh: 'ผัดกะเพราไก่ไข่ดาว',
    description: 'Wok-fried chicken with holy basil, chili and garlic, topped with a crispy fried egg',
    descriptionTh: 'ผัดกะเพราไก่ใส่ไข่ดาว หอมกลิ่นโหระพา รสจัดเข้มข้น',
    price: 95,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Basil_fried_crispy_pork_with_rice_-_Chiang_Mai_-_2017-07-11_%28002%29.jpg/500px-Basil_fried_crispy_pork_with_rice_-_Chiang_Mai_-_2017-07-11_%28002%29.jpg',
    featured: true,
  },
  {
    name: 'Green Curry Chicken',
    nameTh: 'แกงเขียวหวานไก่',
    description: 'Green curry with chicken, bamboo shoots, Thai basil and coconut milk, served with rice',
    descriptionTh: 'แกงเขียวหวานไก่ หอมเครื่องแกงไทย ใส่หน่อไม้สด ใบโหระพา',
    price: 170,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Thai_green_chicken_curry_and_roti.jpg/500px-Thai_green_chicken_curry_and_roti.jpg',
    featured: true,
  },
  {
    name: 'Beef Massaman Curry',
    nameTh: 'แกงมัสมั่นเนื้อ',
    description: 'Rich mild curry with tender beef, potatoes, onions and roasted peanuts',
    descriptionTh: 'แกงมัสมั่นเนื้อนุ่ม มันฝรั่ง หอมใหญ่ ถั่วลิสงคั่ว',
    price: 190,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Kaeng_matsaman_kai.JPG/500px-Kaeng_matsaman_kai.JPG',
    featured: true,
  },
  {
    name: 'Roasted Duck Red Curry',
    nameTh: 'แกงเผ็ดเป็ดย่าง',
    description: 'Roasted duck in spicy red curry with pineapple, tomato and Thai basil',
    descriptionTh: 'แกงเผ็ดเป็ดย่าง ใส่สับปะรด มะเขือเทศ ใบโหระพา',
    price: 200,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Kaeng_phet_mu.jpg/500px-Kaeng_phet_mu.jpg',
  },
  {
    name: 'Pad See Ew',
    nameTh: 'ผัดซีอิ๊วหมู',
    description: 'Stir-fried wide rice noodles with pork, Chinese broccoli in sweet soy sauce',
    descriptionTh: 'ผัดซีอิ๊วหมู เส้นหมี่หอมกระทะ ใส่คะน้าฮ่องกง ไข่',
    price: 100,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Pad_see_ew.jpg/500px-Pad_see_ew.jpg',
  },
  {
    name: 'Crab Fried Rice',
    nameTh: 'ข้าวผัดปู',
    description: 'Fragrant jasmine rice fried with fresh crab meat, scallion and egg',
    descriptionTh: 'ข้าวผัดปูเนื้อปูสด มันๆ หอมกระเทียม ต้นหอม',
    price: 180,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Koh_Mak%2C_Thailand%2C_Fried_rice_with_seafood%2C_Thai_fried_rice.jpg/500px-Koh_Mak%2C_Thailand%2C_Fried_rice_with_seafood%2C_Thai_fried_rice.jpg',
  },
  {
    name: 'Shrimp Fried Rice',
    nameTh: 'ข้าวผัดกุ้ง',
    description: 'Thai fried rice with shrimp, egg, peas, carrots and scallion',
    descriptionTh: 'ข้าวผัดกุ้ง ใส่ไข่ ถั่วลันเตา แครอท หอมใหญ่',
    price: 120,
    category: 'main',
    imageUrl: 'https://www.themealdb.com/images/media/meals/hblwvg1763478203.jpg',
  },
  {
    name: 'Khao Man Gai',
    nameTh: 'ข้าวมันไก่',
    description: 'Poached chicken on fragrant garlic rice with ginger-garlic sauce',
    descriptionTh: 'ข้าวมันไก่ต้มนุ่ม ราดน้ำจิ้มเต้าเจี้ยว ใส่ขิง ต้มจับฉ่าย',
    price: 85,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Hainanese_chicken_rice.jpg/960px-Hainanese_chicken_rice.jpg',
  },
  {
    name: 'Khao Kha Moo',
    nameTh: 'ข้าวขาหมู',
    description: 'Braised pork leg on rice with pickled mustard greens, boiled egg and chili vinegar',
    descriptionTh: 'ข้าวขาหมูพะโล้ชิ้นโต เนื้อเปื่อยตุ๋นเครื่องหอม พร้อมผักกาดดอง',
    price: 120,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Khao_kha_mu_thailand.jpg/500px-Khao_kha_mu_thailand.jpg',
  },
  {
    name: 'Chicken Biryani',
    nameTh: 'ข้าวหมกไก่',
    description: 'Fragrant turmeric biryani rice with tender chicken, served with chili sauce and pickled cucumber',
    descriptionTh: 'ข้าวหมกไก่ หอมเครื่องเทศขมิ้น น้ำจิ้มพริก อาจาด',
    price: 90,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/500px-%22Hyderabadi_Dum_Biryani%22.jpg',
  },
  {
    name: 'Tom Yum Noodle Soup',
    nameTh: 'ก๋วยเตี๋ยวต้มยำ',
    description: 'Spicy tom yum noodle soup with pork, squid, fish balls and crispy wonton',
    descriptionTh: 'ก๋วยเตี๋ยวต้มยำ ใส่หมู ปลาหมึก ลูกชิ้น เกี๊ยวกรอบ',
    price: 95,
    category: 'main',
    imageUrl: 'https://www.themealdb.com/images/media/meals/568t931763584227.jpg',
  },
  {
    name: 'Kuay Jab',
    nameTh: 'ก๋วยจั๊บ',
    description: 'Rolled rice noodles in peppery broth with crispy pork belly, eggs and garlic oil',
    descriptionTh: 'ก๋วยจั๊บน้ำข้น ใส่หมูกรอบ ไข่ต้ม หอมเจียว',
    price: 110,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/%E0%B8%81%E0%B9%8B%E0%B8%A7%E0%B8%A2%E0%B8%88%E0%B8%B1%E0%B9%8A%E0%B8%9A%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%82%E0%B9%89%E0%B8%99_Guay_Jab_Nam_Khon_%2826590769259%29.jpg/960px-%E0%B8%81%E0%B9%8B%E0%B8%A7%E0%B8%A2%E0%B8%88%E0%B8%B1%E0%B9%8A%E0%B8%9A%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%82%E0%B9%89%E0%B8%99_Guay_Jab_Nam_Khon_%2826590769259%29.jpg',
  },
  {
    name: 'Roasted Duck Noodles',
    nameTh: 'บะหมี่เป็ดย่าง',
    description: 'Egg noodles with roasted duck, bok choy and clear savory broth',
    descriptionTh: 'บะหมี่เป็ดย่าง น้ำซุปหอมๆ ใส่ผักกาดขาว',
    price: 130,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/CM_food_court_duck_and_pork.JPG/960px-CM_food_court_duck_and_pork.JPG',
  },
  {
    name: 'Rad Na Pork',
    nameTh: 'ราดหน้าหมู',
    description: 'Wide noodles with pork in silky garlic gravy, topped with crispy fried noodles',
    descriptionTh: 'ราดหน้าหมูน้ำข้น ใส่กระเทียมเจียว คลุกเส้นกรอบอร่อย',
    price: 105,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Kuai-tiao_rat_na_mu.JPG/500px-Kuai-tiao_rat_na_mu.JPG',
  },
  {
    name: 'Garlic Fried Rice',
    nameTh: 'ข้าวผัดกระเทียมหมู',
    description: 'Pork fried in garlic and pepper on steamed rice, served with cucumber and chili vinegar',
    descriptionTh: 'ข้าวกระเทียมผัดกระเทียมเจียว หมูกรอบ แตงกวา พริกน้ำส้ม',
    price: 95,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/50/Thaifriedrice.jpg/500px-Thaifriedrice.jpg',
  },
  {
    name: 'Vegetable Sour Curry',
    nameTh: 'แกงส้มผักรวม',
    description: 'Tangy yellow sour curry with mixed vegetables and shrimp paste',
    descriptionTh: 'แกงส้มผักรวม กะหล่ำปลี ฟักทอง หัวปลี เปรี้ยวแซ่บ',
    price: 90,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Kaeng_som_chaom_thot.jpg/960px-Kaeng_som_chaom_thot.jpg',
  },
  {
    name: 'Pork Blood Soup',
    nameTh: 'ต้มเลือดหมู',
    description: 'Clear soup with pork, blood cube, young ginger, and Chinese celery',
    descriptionTh: 'ต้มเลือดหมู ใส่ขิงอ่อน ขึ้นฉ่าย พริกไทย เมนูฟื้นฟู',
    price: 100,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Pork_intestine_with_blood_cake_soup.jpg/960px-Pork_intestine_with_blood_cake_soup.jpg',
  },
  {
    name: 'Stir-fried Mixed Vegetables',
    nameTh: 'ผัดผักรวมมิตร',
    description: 'Seasonal vegetables stir-fried with oyster sauce and garlic',
    descriptionTh: 'ผัดผักรวมมิตรในซอสหอยนางรม หอมกระเทียม',
    price: 85,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/Making_Stir-Fry_%283286445383%29.jpg/500px-Making_Stir-Fry_%283286445383%29.jpg',
  },
  {
    name: 'Fried Fish with Sweet Chili',
    nameTh: 'ปลาทอดน้ำปลา',
    description: 'Crispy whole fried fish topped with fish sauce and garlic, served with sweet chili',
    descriptionTh: 'ปลาทอดกรอบ ราดน้ำปลาพริกกระเทียม ทานคู่กับผักสด',
    price: 220,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Pla_nin_thot_samun_prai.jpg/960px-Pla_nin_thot_samun_prai.jpg',
  },
  {
    name: 'Seafood Omelette',
    nameTh: 'ไข่เจียวทะเล',
    description: 'Fluffy omelette with shrimp, squid, crab meat served with sweet chili sauce',
    descriptionTh: 'ไข่เจียวทะเลกรอบนอกฟูใน ใส่กุ้ง ปลาหมึก เนื้อปู',
    price: 130,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Khai_Jiao.jpg/960px-Khai_Jiao.jpg',
  },
  {
    name: 'Pork Yellow Curry',
    nameTh: 'ผัดผงกะหรี่หมู',
    description: 'Pork stir-fried in yellow curry paste with potatoes and onions',
    descriptionTh: 'ผัดผงกะหรี่หมู มันฝรั่ง หอมใหญ่ รสชาติหอมเครื่องเทศ',
    price: 110,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Kaeng_kari_kai.JPG/960px-Kaeng_kari_kai.JPG',
  },
  {
    name: 'Stir-fried Shrimp in Curry Paste',
    nameTh: 'ผัดพริกแกงกุ้ง',
    description: 'Shrimp wok-fried with red curry paste, fresh green peppercorn and Thai eggplant',
    descriptionTh: 'ผัดพริกแกงกุ้ง ใส่พริกไทยอ่อน มะเขือเปราะ หอมกระเทียม',
    price: 160,
    category: 'main',
    imageUrl: 'https://www.themealdb.com/images/media/meals/96lt871763480970.jpg',
  },
  {
    name: 'Shrimp Congee',
    nameTh: 'ข้าวต้มกุ้ง',
    description: 'Soft rice porridge with shrimp, ginger, scallion and fried garlic',
    descriptionTh: 'ข้าวต้มกุ้ง ใส่ขิง ต้นหอม กระเทียมเจียว ทานพร้อมไข่เยี่ยวม้า',
    price: 95,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Chinese_rice_congee.jpg/500px-Chinese_rice_congee.jpg',
  },
  {
    name: 'Thai Sukiyaki Soup',
    nameTh: 'สุกี้น้ำ',
    description: 'Thai sukiyaki soup with chicken, napa cabbage, glass noodles and sukiyaki sauce',
    descriptionTh: 'สุกี้น้ำ หมูหรือไก่ ใส่กะหล่ำปลี วุ้นเส้น น้ำจิ้มสุกี้รสเด็ด',
    price: 140,
    category: 'main',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Thai_suki%2C_Thai_hot_pot_ingredients%2C_Bangkok%2C_Thailand.jpg/960px-Thai_suki%2C_Thai_hot_pot_ingredients%2C_Bangkok%2C_Thailand.jpg',
  },

  // ---------- Desserts (7) ----------
  {
    name: 'Mango Sticky Rice',
    nameTh: 'ข้าวเหนียวมะม่วง',
    description: 'Sweet coconut sticky rice with ripe mango and salted coconut cream',
    descriptionTh: 'ข้าวเหนียวมะม่วงน้ำกะทิ ข้าวเหนียวหนึบ มะม่วงสุกหวาน',
    price: 120,
    category: 'dessert',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Mango_sticy_rice_%283859549574%29.jpg/500px-Mango_sticy_rice_%283859549574%29.jpg',
    featured: true,
  },
  {
    name: 'Rubies in Coconut Milk',
    nameTh: 'ทับทิมกรอบ',
    description: 'Crispy water chestnuts coated in red syrup served in sweet coconut milk',
    descriptionTh: 'ทับทิมกรอบ เนื้อลูกแดงกรุบกรอบ กะทิหอมกลมกล่อม ใส่น้ำแข็ง',
    price: 70,
    category: 'dessert',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/Tub_tim_krob_in_Singapore_-_20050520.jpg/960px-Tub_tim_krob_in_Singapore_-_20050520.jpg',
  },
  {
    name: 'Banana in Coconut Milk',
    nameTh: 'กล้วยบวชชี',
    description: 'Ripe bananas simmered in sweet pandan-scented coconut milk',
    descriptionTh: 'กล้วยบวชชี กล้วยน้ำว้าสุก กะทิหอมใบเตย',
    price: 65,
    category: 'dessert',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Kluai_buat_chi.jpg/960px-Kluai_buat_chi.jpg',
  },
  {
    name: 'Pandan Pudding',
    nameTh: 'ขนมเปียกปูน',
    description: 'Soft pandan jelly pudding topped with grated coconut',
    descriptionTh: 'ขนมเปียกปูนนุ่มละมุน หอมกลิ่นใบเตย ราดมะพร้าวขูด',
    price: 55,
    category: 'dessert',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/%E0%B8%82%E0%B8%99%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B8%B5%E0%B8%A2%E0%B8%81%E0%B8%9B%E0%B8%B9%E0%B8%99.jpg/960px-%E0%B8%82%E0%B8%99%E0%B8%A1%E0%B9%80%E0%B8%9B%E0%B8%B5%E0%B8%A2%E0%B8%81%E0%B8%9B%E0%B8%B9%E0%B8%99.jpg',
  },
  {
    name: 'Coconut Ice Cream',
    nameTh: 'ไอติมกะทิ',
    description: 'Creamy homemade coconut ice cream served in a coconut shell with peanuts',
    descriptionTh: 'ไอติมกะทิสด หวานละมุน ทานคู่กับถั่วลิสงคั่ว',
    price: 80,
    category: 'dessert',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Coconut_Ice_Cream%2C_Bangkok.jpg/960px-Coconut_Ice_Cream%2C_Bangkok.jpg',
  },
  {
    name: 'Lod Chong',
    nameTh: 'ลอดช่องน้ำกะทิ',
    description: 'Green pandan rice-flour noodles in sweet coconut milk with shaved ice',
    descriptionTh: 'ลอดช่องเย็น น้ำกะทิหอมใบเตย เส้นลอดช่องนุ่มลื่น',
    price: 60,
    category: 'dessert',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Lod_Chong_Singapore_%2819668605624%29.jpg/960px-Lod_Chong_Singapore_%2819668605624%29.jpg',
  },
  {
    name: 'Sweet Taro Balls',
    nameTh: 'บัวลอยไข่หวาน',
    description: 'Chewy taro and sweet potato dumplings in warm coconut milk with soft egg',
    descriptionTh: 'บัวลอยไข่หวาน ตัวหอมมันนุ่ม ราดกะทิอุ่นๆ ใส่ไข่หวาน',
    price: 70,
    category: 'dessert',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Bualoi_Boiled_flour_balls_with_coconut_milk.jpg/500px-Bualoi_Boiled_flour_balls_with_coconut_milk.jpg',
  },

  // ---------- Drinks (5) ----------
  {
    name: 'Thai Iced Tea',
    nameTh: 'ชาไทย',
    description: 'Classic Thai iced tea with condensed milk, ice-cold and refreshing',
    descriptionTh: 'ชาไทยเย็นเข้มข้น ปรุงด้วยนมข้นหวานมัน อร่อยสดชื่น',
    price: 65,
    category: 'drink',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Cha_yen.JPG/500px-Cha_yen.JPG',
    featured: true,
  },
  {
    name: 'Lime Soda',
    nameTh: 'น้ำมะนาวโซดา',
    description: 'Fresh lime juice with soda and frozen ice cubes',
    descriptionTh: 'น้ำมะนาวโซดา เปรี้ยวสดชื่น หวานพอดีจั๊กจี้',
    price: 55,
    category: 'drink',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Cider_%28lemon-lime_drink%29.jpg/960px-Cider_%28lemon-lime_drink%29.jpg',
  },
  {
    name: 'Thai Iced Coffee (Oliang)',
    nameTh: 'โอเลี้ยง',
    description: 'Authentic Thai iced black coffee served with fresh ice',
    descriptionTh: 'โอเลี้ยงกาแฟดำเข้มข้นแบบไทยๆ เสิร์ฟพร้อมน้ำแข็ง',
    price: 60,
    category: 'drink',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Oliang_%E0%B9%82%E0%B8%AD%E0%B9%80%E0%B8%A5%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%87_oleang_olieng_Thai_iced_coffee_at_Ayutthaya.jpg/500px-Oliang_%E0%B9%82%E0%B8%AD%E0%B9%80%E0%B8%A5%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%87_oleang_olieng_Thai_iced_coffee_at_Ayutthaya.jpg',
  },
  {
    name: 'Butterfly Pea Drink',
    nameTh: 'น้ำอัญชัน',
    description: 'Blue butterfly pea flower drink with honey and lime, turns purple when mixed',
    descriptionTh: 'น้ำอัญชัน ดอกอัญชันสด ใส่น้ำผึ้ง บีบมะนาวเปลี่ยนสีสวย',
    price: 50,
    category: 'drink',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Blue_tea.jpg/500px-Blue_tea.jpg',
  },
  {
    name: 'Roselle Juice',
    nameTh: 'น้ำกระเจี๊ยบ',
    description: 'Sweet and tangy hibiscus juice served ice-cold',
    descriptionTh: 'น้ำกระเจี๊ยบเปรี้ยวหวาน สีแดงสดใส ชื่นใจ',
    price: 50,
    category: 'drink',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Hibiscus_tea.jpg/500px-Hibiscus_tea.jpg',
  },

  // ---------- Sides (3) ----------
  {
    name: 'Steamed Jasmine Rice',
    nameTh: 'ข้าวสวย',
    description: 'Fluffy Thai jasmine rice, freshly steamed',
    descriptionTh: 'ข้าวสวยหอมมะลิหุงใหม่ อร่อยนุ่ม',
    price: 30,
    category: 'side',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Meshi_001.jpg/500px-Meshi_001.jpg',
  },
  {
    name: 'Sticky Rice',
    nameTh: 'ข้าวเหนียว',
    description: 'Steamed glutinous rice, perfect with curries and salads',
    descriptionTh: 'ข้าวเหนียวญวนหุงสุกเหนียวนุ่ม ทานคู่กับลาบหรือแกง',
    price: 35,
    category: 'side',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Chapssal_%28glutinous_rice%29.jpg/500px-Chapssal_%28glutinous_rice%29.jpg',
  },
  {
    name: 'Fried Egg',
    nameTh: 'ไข่ดาว',
    description: 'Crispy-edged fried egg, the perfect topping for any dish',
    descriptionTh: 'ไข่ดาวกรอบขอบ จิ้มกับข้าวได้ทุกเมนู',
    price: 25,
    category: 'side',
    imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Fried_Egg_2.jpg/500px-Fried_Egg_2.jpg',
  },
];

const seedDB = async () => {
  const client = await pool.connect();
  try {
    await initDb();

    // Clear existing data
    await client.query('TRUNCATE orders RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE menus RESTART IDENTITY CASCADE');

    // Seed menu items
    const createdMenus = [];
    for (const item of menuItems) {
      const result = await client.query(
        `INSERT INTO menus (name, name_th, description, description_th, price, category, image_url, available, featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8) RETURNING *`,
        [item.name, item.nameTh, item.description, item.descriptionTh, item.price, item.category, item.imageUrl, item.featured === true]
      );
      createdMenus.push(result.rows[0]);
    }
    console.log(`Seeded ${createdMenus.length} Thai menu items`);

    // Build sample orders
    const makeItems = (refs) =>
      refs.map(([menu, qty]) => ({
        menuItem: String(menu.id),
        name: menu.name,
        nameTh: menu.name_th,
        price: Number(menu.price),
        quantity: qty,
      }));

    const sum = (items) => items.reduce((s, i) => s + i.price * i.quantity, 0);
    const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    // Make the report demo look real: 26 orders spread across ~2 years
    const orderSpecs = [
      // This week (daily chart)
      { d: 0, status: 'pending',    items: [[createdMenus[0], 1], [createdMenus[10], 1], [createdMenus[42], 2]], name: 'Narisara Ko / นริศรา โก่งคีรี', table: '5' },
      { d: 0, status: 'preparing',  items: [[createdMenus[11], 2], [createdMenus[47], 2]], name: 'James Wilson', table: '2' },
      { d: 1, status: 'completed',  items: [[createdMenus[35], 2], [createdMenus[2], 1]], name: 'Pimchanok / พิมชนก', table: '8' },
{ d: 1, status: 'completed', items: [[createdMenus[13], 1], [createdMenus[48], 1]], name: 'Katie Brown', type: 'delivery', address: '42/5 Charoen Krung Rd., Bangkok' },
      { d: 2, status: 'completed', items: [[createdMenus[12], 1], [createdMenus[43], 1], [createdMenus[44], 1]], name: 'Chaiwat / ชัยวัฒน์', table: '4' },
      { d: 3, status: 'completed', items: [[createdMenus[19], 1], [createdMenus[49], 2]], name: 'Maria Garcia', type: 'delivery', address: '88 Sukhumvit Soi 4, Bangkok' },
      { d: 3, status: 'completed',  items: [[createdMenus[22], 1], [createdMenus[45], 2]], name: 'Somsri / สมศรี', table: '6' },
      { d: 4, status: 'completed',  items: [[createdMenus[1], 2], [createdMenus[35], 1]], name: 'Daniel Lee', table: '7' },
      { d: 5, status: 'completed',  items: [[createdMenus[10], 2], [createdMenus[42], 1]], name: 'Aranya / อรัญญา', table: '3' },
{ d: 6, status: 'completed', items: [[createdMenus[15], 1], [createdMenus[47], 2], [createdMenus[48], 1]], name: 'Robert Chen', type: 'delivery', address: '15 Silom Rd., Bangkok' },
      // Previous weeks (monthly chart)
      { d: 9,  status: 'completed', items: [[createdMenus[0], 2], [createdMenus[30], 1]], name: 'Kanya / กัญญา', table: '2' },
      { d: 12, status: 'completed', items: [[createdMenus[18], 1], [createdMenus[36], 2]], name: 'Emma Davis', table: '4' },
      { d: 16, status: 'completed', items: [[createdMenus[11], 3], [createdMenus[49], 1]], name: 'Thiwa / ฐิวัชร์', table: '6' },
      { d: 20, status: 'completed', items: [[createdMenus[3], 1], [createdMenus[44], 2], [createdMenus[42], 1]], name: 'Olivia Moore', table: '10' },
      { d: 25, status: 'completed', items: [[createdMenus[13], 2], [createdMenus[47], 1]], name: 'Nok / นก', table: '1' },
      { d: 30, status: 'completed', items: [[createdMenus[35], 1], [createdMenus[38], 3]], name: 'Lucas Smith', table: '7' },
      // Previous months (monthly chart)
      { d: 45,  status: 'completed', items: [[createdMenus[10], 3], [createdMenus[43], 2]], name: 'Rattana / รัตนา', table: '3' },
      { d: 60,  status: 'completed', items: [[createdMenus[12], 1], [createdMenus[15], 1], [createdMenus[42], 1]], name: 'Sophia Jones', table: '8' },
      { d: 75,  status: 'completed', items: [[createdMenus[0], 2], [createdMenus[2], 1], [createdMenus[48], 1]], name: 'Prasert / ประเสริฐ', table: '12' },
      { d: 95,  status: 'completed', items: [[createdMenus[35], 2], [createdMenus[42], 2]], name: 'Ethan White', table: '5' },
      { d: 120, status: 'completed', items: [[createdMenus[11], 2], [createdMenus[49], 1]], name: 'Duangjai / ดวงใจ', table: '9' },
      { d: 150, status: 'completed', items: [[createdMenus[19], 1], [createdMenus[36], 2], [createdMenus[37], 2]], name: 'Ava Taylor', table: '6' },
      { d: 190, status: 'completed', items: [[createdMenus[10], 2], [createdMenus[44], 1]], name: 'Somchai / สมชาย', table: '2' },
      { d: 250, status: 'cancelled', items: [[createdMenus[3], 2], [createdMenus[42], 1]], name: 'Mia Harris', table: '4' },
      // Last year (yearly chart - another bucket for 2025)
      { d: 400, status: 'completed', items: [[createdMenus[0], 2], [createdMenus[10], 2], [createdMenus[42], 2]], name: 'Suda / สุดา', table: '7' },
      { d: 500, status: 'completed', items: [[createdMenus[35], 2], [createdMenus[43], 1]], name: 'Noah Clark', table: '10' },
      { d: 600, status: 'completed', items: [[createdMenus[12], 2], [createdMenus[48], 2]], name: 'Malee / มาลี', table: '3' },
    ];

    for (let i = 0; i < orderSpecs.length; i++) {
      const { d, status, items, name, table = '', type = 'dine_in', address = '' } = orderSpecs[i];
      const orderItems = makeItems(items);
      const orderNumber = `ORD-${String(i + 1).padStart(4, '0')}`;
      await client.query(
        `INSERT INTO orders (order_number, items, total_price, customer_name, phone, table_number, address, notes, status, order_type, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          orderNumber,
          JSON.stringify(orderItems),
          sum(orderItems),
          name,
          `08${String(10000000 + Math.floor(Math.random() * 89999999))}`,
          type === 'delivery' ? '' : table,
          type === 'delivery' ? address : '',
          '',
          status,
          type,
          daysAgo(d),
        ]
      );
    }
    console.log(`Seeded ${orderSpecs.length} sample orders`);

    console.log('\nSeeding completed successfully!');
    console.log(`Admin login password: admin123`);
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    client.release();
    pool.end();
  }
};

seedDB();