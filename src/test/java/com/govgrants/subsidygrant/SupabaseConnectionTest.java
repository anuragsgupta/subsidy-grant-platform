package com.govgrants.subsidygrant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class SupabaseConnectionTest {

    private static final Logger log = LoggerFactory.getLogger(SupabaseConnectionTest.class);

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("Test Supabase connection, metadata, and query execution")
    void testSupabaseConnection() throws Exception {
        assertThat(dataSource).isNotNull();

        log.info("Attempting to connect to Supabase via configured DataSource...");

        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection).isNotNull();

            DatabaseMetaData metaData = connection.getMetaData();
            log.info("Successfully connected to Supabase!");
            log.info("Database Product Name    : {}", metaData.getDatabaseProductName());
            log.info("Database Product Version : {}", metaData.getDatabaseProductVersion());
            log.info("JDBC Driver Name         : {}", metaData.getDriverName());
            log.info("JDBC Driver Version      : {}", metaData.getDriverVersion());
            log.info("JDBC URL                 : {}", metaData.getURL());
            log.info("Database User            : {}", metaData.getUserName());

            assertThat(metaData.getDatabaseProductName())
                    .containsIgnoringCase("PostgreSQL");

            try (Statement statement = connection.createStatement();
                 ResultSet rs = statement.executeQuery(
                         "SELECT current_database(), current_user, version(), current_schema()")) {

                assertThat(rs.next()).isTrue();
                String databaseName = rs.getString(1);
                String currentUser = rs.getString(2);
                String fullVersion = rs.getString(3);
                String currentSchema = rs.getString(4);

                log.info("Current Database : {}", databaseName);
                log.info("Current User     : {}", currentUser);
                log.info("Current Schema   : {}", currentSchema);
                log.info("PostgreSQL Build : {}", fullVersion);

                assertThat(databaseName).isNotEmpty();
                assertThat(currentUser).isNotEmpty();
                assertThat(fullVersion).containsIgnoringCase("PostgreSQL");
            }
        }
    }
}
