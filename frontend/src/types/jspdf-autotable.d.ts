import { jsPDF } from 'jspdf';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => void;
        previousAutoTable: {
            finalY: number;
        };
    }
}

declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';
    
    interface UserOptions {
        head?: any[][];
        body?: any[][];
        startY?: number;
        margin?: any;
        theme?: string;
        styles?: any;
    }

    interface jsPDFWithAutoTable extends jsPDF {
        autoTable(options: UserOptions): void;
        previousAutoTable: {
            finalY: number;
        };
    }

    function autoTable(doc: jsPDF, options: UserOptions): void;
    export default autoTable;
} 