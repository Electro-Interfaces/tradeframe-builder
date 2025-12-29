import os
from fastmcp import FastMCP
from pathlib import Path

# Определяем базовую директорию для операций с файлами.
# По умолчанию это текущая рабочая директория.
# Для безопасности, все операции будут ограничены этой директорией.
BASE_DIR = Path(os.getcwd()).resolve()

mcp = FastMCP(name="FilesystemMCP")

def _resolve_path(file_path: str) -> Path:
    """Разрешает путь и проверяет, находится ли он внутри BASE_DIR."""
    resolved_path = (BASE_DIR / file_path).resolve()
    if not resolved_path.is_relative_to(BASE_DIR):
        raise ValueError(f"Доступ запрещен: {file_path} находится вне разрешенной директории.")
    return resolved_path

@mcp.tool
def read_file_content(file_path: str) -> str:
    """
    Читает и возвращает содержимое текстового файла.
    
    Args:
        file_path: Путь к файлу относительно BASE_DIR.
    
    Returns:
        Содержимое файла в виде строки.
    
    Raises:
        FileNotFoundError: Если файл не найден.
        ValueError: Если путь находится вне разрешенной директории.
    """
    path = _resolve_path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Файл не найден: {file_path}")
    return path.read_text(encoding="utf-8")

@mcp.tool
def write_file_content(file_path: str, content: str):
    """
    Записывает содержимое в текстовый файл.
    
    Args:
        file_path: Путь к файлу относительно BASE_DIR.
        content: Содержимое для записи в файл.
        
    Raises:
        ValueError: Если путь находится вне разрешенной директории.
    """
    path = _resolve_path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True) # Создаем родительские директории, если их нет
    path.write_text(content, encoding="utf-8")

@mcp.tool
def list_directory_contents(dir_path: str = ".") -> list[str]:
    """
    Перечисляет содержимое директории (файлы и поддиректории).
    
    Args:
        dir_path: Путь к директории относительно BASE_DIR. По умолчанию текущая директория.
        
    Returns:
        Список имен файлов и директорий.
        
    Raises:
        NotADirectoryError: Если указанный путь не является директорией.
        ValueError: Если путь находится вне разрешенной директории.
    """
    path = _resolve_path(dir_path)
    if not path.is_dir():
        raise NotADirectoryError(f"Не является директорией: {dir_path}")
    return [entry.name for entry in path.iterdir()]

@mcp.tool
def file_or_directory_exists(path: str) -> bool:
    """
    Проверяет, существует ли файл или директория по указанному пути.
    
    Args:
        path: Путь к файлу или директории относительно BASE_DIR.
        
    Returns:
        True, если существует, иначе False.
        
    Raises:
        ValueError: Если путь находится вне разрешенной директории.
    """
    resolved_path = _resolve_path(path)
    return resolved_path.exists()

if __name__ == "__main__":
    mcp.run()
