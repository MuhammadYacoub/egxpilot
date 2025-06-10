# Dockerfile for EGXpilot Node.js app
FROM node:20-alpine

# تعيين مجلد العمل داخل الحاوية
WORKDIR /app

# نسخ ملفات التعريف أولاً لتسريع build عند عدم تغيير الكود
COPY package*.json ./

# تثبيت الحزم
RUN npm install --production

# نسخ بقية ملفات المشروع
COPY . .

# تعيين متغير البيئة للبورت الافتراضي
ENV PORT=4040

# فتح البورت
EXPOSE 4040

# أمر التشغيل الافتراضي
CMD ["npm", "start"]
