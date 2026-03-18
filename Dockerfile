FROM eclipse-temurin:20-jre-alpine
WORKDIR /app
COPY build/libs/one-more-*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
