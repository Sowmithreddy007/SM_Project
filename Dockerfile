# syntax=docker/dockerfile:1

# ---------- Frontend ----------
FROM node:22-alpine AS frontend-build

WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
RUN npm run build -- --outDir /build/static --emptyOutDir

# ---------- Backend ----------
FROM maven:3.9-eclipse-temurin-21 AS backend-build

WORKDIR /build

COPY backend/pom.xml backend/pom.xml
RUN cd backend && mvn -q -DskipTests dependency:go-offline

COPY backend/src backend/src
RUN rm -rf backend/src/main/resources/static
COPY --from=frontend-build /build/static backend/src/main/resources/static
RUN cd backend && mvn -q -DskipTests package

# ---------- Runtime ----------
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=backend-build /build/backend/target/socialdesk-*.jar /app/app.jar

RUN mkdir -p /app/backups && chown -R app:app /app

USER app

EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+UseContainerSupport", "-jar", "/app/app.jar"]
