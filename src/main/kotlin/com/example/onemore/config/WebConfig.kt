package com.example.onemore.config

import com.example.onemore.ratelimit.RateLimitFilter
import com.example.onemore.security.JwtAuthFilter
import com.example.onemore.security.PlayerContextArgumentResolver
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig(
    private val jwtAuthFilter: JwtAuthFilter,
    private val rateLimitFilter: RateLimitFilter,
    private val playerContextArgumentResolver: PlayerContextArgumentResolver
) : WebMvcConfigurer {

    @Bean
    fun rateLimitFilterRegistration(): FilterRegistrationBean<RateLimitFilter> {
        return FilterRegistrationBean(rateLimitFilter).apply {
            addUrlPatterns("/api/*")
            order = 5  // runs before JWT filter
        }
    }

    @Bean
    fun jwtFilterRegistration(): FilterRegistrationBean<JwtAuthFilter> {
        return FilterRegistrationBean(jwtAuthFilter).apply {
            addUrlPatterns("/api/*")
            order = 10
        }
    }

    override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
        resolvers.add(playerContextArgumentResolver)
    }

    override fun addCorsMappings(registry: CorsRegistry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:3000", "http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600)
    }
}
