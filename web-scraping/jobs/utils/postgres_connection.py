# Third-Party Imports
import psycopg2
from psycopg2 import sql

# Local Application Imports
from .logger import Logger

class PostgresConnection:
    def __init__(self, host, user, password, database, logger=None):
        self.host = host
        self.user = user
        self.password = password
        self.database = database
        self.conn = None
        self.cursor = None
        self.logger = logger

    def connect(self):
        """Establish connection to PostgreSQL database."""
        try:
            self.conn = psycopg2.connect(
                host=self.host,
                user=self.user,
                password=self.password,
                database=self.database,
                connect_timeout=5
            )
            if self.conn:
                self.cursor = self.conn.cursor()
        except psycopg2.Error as e:
            if self.logger:
                self.logger.log_json("ERROR", f"Unable to connect to PostgreSQL database: {e}", {"host": self.host})
            self.conn = None

    def close(self):
        """Close the PostgreSQL connection."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()

    def execute_query(self, query, params=None, fetch=False):
        """Execute a query on the PostgreSQL database.

        Args:
            query (str): The SQL query to execute.
            params (tuple or list, optional): Parameters to bind to the query.
            fetch (bool, optional): Whether to fetch results from a SELECT query.

        Returns:
            list: Results from a SELECT query (if fetch=True).
        """
        try:
            if not self.conn:
                raise ConnectionError("PostgreSQL connection is not established")
            
            self.cursor.execute(query, params or ())
            if fetch:
                return self.cursor.fetchall()
            self.conn.commit()
            return True
        except psycopg2.Error as e:
            if self.logger:
                self.logger.log_json("ERROR", f"Failure executing query: {e}")
            return None
        except ConnectionError as e:
            if self.logger:
                self.logger.log_json("ERROR", f"Connection error: {e}")
            return None

    def insert(self, table, data):
        """Insert data into a table.

        Args:
            table (str): The table to insert data into.
            data (dict): A dictionary of column-value pairs to insert into the table.
        """
        schema, table = table.split(".")
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['%s'] * len(data))
        query = sql.SQL("INSERT INTO {}.{} ({}) VALUES ({})").format(
            sql.Identifier(schema),
            sql.Identifier(table),
            sql.SQL(columns),
            sql.SQL(placeholders)
        )
        if self.execute_query(query, tuple(data.values())) is None:
            if self.logger:
                self.logger.log_json("ERROR", "Failed to insert data", {"table": table, "data": data})
            return False
        return True

    def select(self, table, columns="*", where=None, params=None):
        """Select data from a table.

        Args:
            table (str): The table to select data from.
            columns (str, optional): Columns to select, defaults to '*' for all columns.
            where (str, optional): The WHERE condition, if any.
            params (tuple or list, optional): Parameters to bind to the WHERE clause.

        Returns:
            list: Results from the SELECT query.
        """
        query = f"SELECT {columns} FROM {table}"
        if where:
            query += f" WHERE {where}"
        return self.execute_query(query, params, fetch=True)

    # Context Manager methods
    def __enter__(self):
        """Enter the context manager (opens the connection)."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit the context manager (closes the connection)."""
        self.close()
