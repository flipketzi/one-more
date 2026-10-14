# Ubuntu-based variant: the Alpine images of Temurin 20 are not published for arm64
FROM eclipse-temurin:20-jre
WORKDIR /app
COPY build/libs/one-more-*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
