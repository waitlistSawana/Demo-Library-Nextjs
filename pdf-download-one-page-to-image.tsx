"use client";

// pages/pdf-demo.tsx
import React, { useState, useRef, useEffect } from "react";
// import * as pdfjsLib from 'pdfjs-dist';
import { pdfjs } from "react-pdf";

// 导入 pdf.worker.js
// pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFDemo: React.FC = () => {
  // 定义状态，并指定类型
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // 用于显示错误信息

  // 处理文件上传，使用 File 类型
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target instanceof HTMLInputElement) {
      const file = event.target.files?.[0];
      if (file && file.type === "application/pdf") {
        setPdfFile(file);
        setErrorMessage(null); // 清除错误信息
      } else if (file) {
        // 如果选择的文件不是 PDF，则清除文件并给出提示
        setPdfFile(null);
        alert("Please select a PDF file.");
        setErrorMessage("Please select a valid PDF file"); // 设置错误信息
      }
    }
  };

  // 页面加载时, 如果有 pdfFile, 加载 pdf 文件
  useEffect(() => {
    if (pdfFile) {
      loadPdf();
    }
  }, [pdfFile]);

  // 加载 PDF 文件，包括初始化和重新加载
  const loadPdf = async () => {
    setLoading(true);
    if (!pdfFile) return;
    const reader = new FileReader();

    reader.onload = async (event) => {
      if (event.target && event.target.result) {
        try {
          // 检查读取到的数据是否是有效的 ArrayBuffer
          const result = event.target.result;
          if (!(result instanceof ArrayBuffer)) {
            setErrorMessage("Failed to read the file as ArrayBuffer.");
            return;
          }
          const typedarray = new Uint8Array(result); // 转换为 Uint8Array
          // 加载 PDF 文件
          const loadingTask = pdfjs.getDocument({ data: typedarray });
          const pdf = await loadingTask.promise;
          setNumPages(pdf.numPages); // 设置 PDF 总页数
          renderPage(pdf, pageNumber); // 渲染当前页码的页面
          setErrorMessage(null); // 清除错误信息
        } catch (error) {
          setErrorMessage(`Error loading PDF: ${error}`); // 设置错误信息
          console.error("Error loading PDF:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setErrorMessage("Failed to read file data."); // 设置错误信息
        console.error("Error reading file, result is null or target is null");
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read the file."); // 设置错误信息
      console.error("Error reading the file.");
      setLoading(false);
    };
    reader.readAsArrayBuffer(pdfFile);
  };

  // 渲染指定的 PDF 页面, 使用 pdfjsLib.PDFDocumentProxy
  const renderPage = async (pdf: pdfjs.PDFDocumentProxy, pageNum: number) => {
    if (!pdf) return;
    try {
      const page = await pdf.getPage(pageNum); // 获取指定页码的页面对象
      const viewport = page.getViewport({ scale: 1 }); // 获取页面视图
      const canvas = canvasRef.current; // 获取 canvas 元素

      if (!canvas) return;
      const context = canvas.getContext("2d"); // 获取 canvas 绘图上下文

      // 设置 canvas 尺寸
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 渲染页面到 canvas
      const renderContext = {
        canvasContext: context!, // 断言 context 不为 null
        viewport: viewport,
      };
      await page.render(renderContext).promise;
    } catch (error) {
      console.error("Error rendering page:", error);
    }
  };

  // 处理页码输入变化，使用 event.target.value 的类型断言
  const handlePageInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newPage = parseInt(event.target.value, 10);
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
      if (pdfFile) {
        loadPdf();
      }
    }
  };

  // 处理单页下载
  const handleDownloadPage = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas is null. Cannot download.");
      return;
    }

    const dataURL = canvas.toDataURL("image/png"); // 将 canvas 内容转换为 base64 URL ["image/jpeg","image/png","image/webp"]

    // 创建一个 a 标签，并设置其属性来触发下载
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `page_${pageNumber}.png`;
    document.body.appendChild(link); // 将 a 标签添加到 body 中
    link.click(); // 模拟点击
    document.body.removeChild(link); // 下载完成后，移除 a 标签
  };

  // 渲染分页按钮
  const renderPagination = () => {
    const pageButtons = [];
    for (let i = 1; i <= numPages; i++) {
      pageButtons.push(
        <button
          key={i}
          onClick={() => {
            setPageNumber(i);
            loadPdf();
          }}
          style={{ fontWeight: pageNumber === i ? "bold" : "normal" }}
        >
          {i}
        </button>,
      );
    }
    return <div>{pageButtons}</div>;
  };

  // 组件渲染
  return (
    <div>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />{" "}
      {/* 文件上传 */}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}{" "}
      {/* 显示错误信息 */}
      {pdfFile && (
        <>
          <div>
            <label>
              Page Number:
              <input
                type="number"
                value={pageNumber}
                min={1}
                max={numPages}
                onChange={handlePageInputChange}
              />
              / {numPages}
            </label>
          </div>
          <canvas ref={canvasRef} style={{ border: "1px solid black" }} />{" "}
          {/* 显示 PDF 页面的 canvas */}
          {loading ? <p>Loading...</p> : null}
          <div>{renderPagination()}</div>
          <button onClick={handleDownloadPage}>Download Page</button>{" "}
          {/* 下载当前页的按钮 */}
        </>
      )}
    </div>
  );
};

export default PDFDemo;
