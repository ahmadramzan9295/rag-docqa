import asyncio
from app.core.loader import load_document
from app.core.vectorstore import vector_store

async def main():
    try:
        data = b"Hello world. This is a test document."
        docs = load_document(data, "test.txt")
        stats = vector_store.ingest(docs)
        print("Success:", stats)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(main())
