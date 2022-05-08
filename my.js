const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const fugaszélesség = 0.3;

const csempeszélesség = 60;
const legkisebbvágás = 3;

const CsempeAdagoló = {
    stats: new Map(), // tipus->stat

    kérek: function(tipus, szelesseg) {
        if (szelesseg < legkisebbvágás || (szelesseg > csempeszélesség - legkisebbvágás && szelesseg < csempeszélesség)) {
            console.error("Tul kicsi csempecsik: ", szelesseg)
        }
        if (!this.stats.has(tipus)) {
            this.stats.set(tipus, {
                count: 0,
                parts: [],
                leftoverCm: 0
            })
        }
        if (szelesseg == 60) {
            this.stats.get(tipus).count ++
        } else {
            this.stats.get(tipus).parts.push(szelesseg)
        }
    },

    calculate: function() {
        // alapbol ez ladapakolas lenne, de itt most egyelore ket vagott elu csempet nem rakunk fel,
        // igy ennyivel konnyebb a parositas
        console.log(this.stats);
        this.stats.forEach((stats, tipus) => {
            stats.name = tipus.name
            stats.origFullCount = stats.count;
            stats.origParts = [...stats.parts]
            stats.parts.sort((a, b) => a - b)
            while (stats.parts.length > 0) {
                let smallest = stats.parts[0];
                let remains = csempeszélesség - smallest;
                let i = 0;
                for (i = stats.parts.length - 1; i > 0 && stats.parts[i] > remains; i --);
                if (i > 0) {
                    // we've found a pair, we can take that counted in
                    stats.leftoverCm += remains - stats.parts[i];
                    stats.parts.splice(i, 1);
                } else {
                    stats.leftoverCm += remains;
                }
                stats.count ++; // we used up a whole item
                stats.parts.shift();
            }
            stats.leftoverRatio = Math.floor(100.0 * stats.leftoverCm / (stats.count * csempeszélesség));
            stats.dobozSzam = Math.ceil(stats.count / tipus.darab);
            stats.leftoverEgesz = stats.dobozSzam * tipus.darab - stats.count;
            stats.price = stats.dobozSzam * tipus.price;
            stats.lostPrice = (stats.leftoverEgesz + (stats.leftoverCm / csempeszélesség)) / tipus.darab * tipus.price;
        })
        let values = Array.from(this.stats.values());
        console.log(values);
        console.table(values, ["name", "dobozSzam", "leftoverRatio", "leftoverEgesz", "price", "lostPrice"]);
        console.log("Fullprice: ", values.reduce((p, o) => p + o.price, 0))
        console.log("Full lost value: ", values.reduce((p, o) => p + o.lostPrice, 0))
    }
}

const KekHullam = {
    name: "KekHullam",
    price: 8500,
    darab: 10,
    texture: new THREE.TextureLoader().load( "textures/kekhullam.png" )
}
const SzurkeCsik = {
    price: 2400, //listello carneval
    darab: 1,
    name: "SzurkeCsik",
    color: 0xbbbbbb, shininess: 100
}
const FeherHullam = {
    price: 8500,
    darab: 10,
    name: "FeherHullam",
    texture: new THREE.TextureLoader().load( "textures/feherhullam.png" ), shininess: 0
}
const SimaFeher = {
    price: 8500,
    darab: 10,
    name: "SimaFeher",
    color: 0xeeeeee
}
const CsempeTipusok = [ KekHullam, SzurkeCsik, FeherHullam, SimaFeher ];

const csemperend = [
    { height: 15, tipus: KekHullam },
    { height: 20, tipus: KekHullam },
    { height: 20, tipus: KekHullam },
    { height: 20, tipus: KekHullam },
    { height: 4.5, tipus: SzurkeCsik },
    { height: 20, tipus: FeherHullam },
    { height: 20, tipus: FeherHullam },
    { height: 4.5, tipus: SzurkeCsik },
    { height: 20, tipus: SimaFeher }
]

// one-sided rectangle, centered
function csempeGeometry(w, h, uw, uh) {
    const g = new THREE.BufferGeometry()
    let vertices = []
    let indices = []
    let normals = []
    vertices.push(-w/2, -h/2, 0); // bottomleft
    vertices.push(w/2, -h/2, 0); // bottomright
    vertices.push(w/2, h/2, 0); // topright
    vertices.push(-w/2, h/2, 0); // topleft
    for (i = 0; i < 4; i++) normals.push(0, 0, 1);
    indices.push(0, 1, 2);
    indices.push(0, 2, 3);
    g.setIndex(indices);
    g.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    g.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
    let uv = []
    uv.push(0, 0);
    uv.push(w/uw, 0);
    uv.push(w/uw, h/uh);
    uv.push(0, h/uh);
    g.setAttribute( 'uv', new THREE.Float32BufferAttribute( uv, 2 ) );
    return g;
}

function csempésFal(width, height, vspan, hstart = 0) {
    //height = 74
    const group = new THREE.Group();
    let i = 0;
    let starterWidth = csempeszélesség;
    egeszek = Math.floor(width / (csempeszélesség + fugaszélesség));
    //vspan = 'left'
    if (egeszek > 0) {
        switch (vspan) {
            case 'left': break;
            case 'right': starterWidth = width - egeszek * (csempeszélesség + fugaszélesség); break;
            case 'split': starterWidth = (width - egeszek * (csempeszélesség + fugaszélesség)) / 2; break; // a tort csempet ket oldalra rendezi
            case 'center': starterWidth = width / 2 - Math.floor(egeszek/2) * (csempeszélesség + fugaszélesség); break; // a fal kozepvonalahoz tolja az illesztest
        }
    }
    for (y = 0; y < height; i++) {
        const csempesor = csemperend[Math.min(i, csemperend.length - 1)];
        th = Math.min(csempesor.height, height - y);
        if (y + th > hstart) {
            let szelesseg = starterWidth;
            for (x = 0; x < width; ) {
                tw = Math.min(szelesseg, (width - x));
                CsempeAdagoló.kérek(csempesor.tipus, tw);
                const geometry = csempeGeometry(tw, th, 60, 20);
                const material = csempesor.tipus.color ? new THREE.MeshPhongMaterial({ color: csempesor.tipus.color }):
                new THREE.MeshPhongMaterial({ map: csempesor.tipus.texture, shininess: csempesor.tipus.shininess ? csempesor.tipus.shininess: 50 })
                const cube = new THREE.Mesh(geometry, material);
                cube.position.set(x + tw/2, y + th/2, 0);
                group.add(cube);    
                x += tw + fugaszélesség;
                szelesseg = csempeszélesség; // reset from starterszelesseg to regular szelesseg
            }
        } // vizszintes vagast nem renderelek es nem trackelek, az most a setup miatt nem szamit
        y += th + fugaszélesség;
    }
    return group
}

const light = new THREE.AmbientLight( 0xa0a0a0 ); // soft white light
scene.add( light );
const pl = new THREE.PointLight( 0xffffff, 1, 200 );
pl.position.set( 150, 200, 100 );
scene.add( pl );


scene.add(csempésFal(200, 207, 'right')); // tukros
scene.add(csempésFal(198, 207, 'right').rotateY(Math.PI / 2).translateX(-198)); // radiatoros
scene.add(csempésFal(76, 207, 'left').translateX(198 + 8)); // zuhany bal
scene.add(csempésFal(93, 207, 'right').translateX(198 + 8 + 76).rotateY(-Math.PI / 2)) // zuhany hatso
scene.add(csempésFal(85, 207, 'left', 57).translateX(198 + 8 + 76).rotateY(-Math.PI / 2).translateX(93 + 8)) // kadas hatso
scene.add(csempésFal(149 + 33 - 2, 207, 'right', 57).rotateY(Math.PI).translateX(-280-2).translateZ(-186)) // kadas jobb

scene.add(csempésFal(76, 80, 'center').translateZ(93).rotateY(Math.PI).translateX(-76-198-8)) // zuhany kad feloli also fala

scene.add(csempésFal(63, 53, 'center').translateZ(93 + 8 + 12).rotateY(Math.PI).translateX(-63-3-97-33)) // kad zuhanyfelol
scene.add(csempésFal(74, 53, 'center').rotateY(-Math.PI/2).translateX(93 + 8 + 12).translateZ(-3 - 97 - 33)) // kad ajto felol


//scene.add(csempésFal(200, 75, 'right')); // tukros


CsempeAdagoló.calculate();

const controls = new THREE.OrbitControls(camera, renderer.domElement);

//controls.update() must be called after any manual changes to the camera's transform
camera.position.set(100, 100, 300);
controls.update();
controls.target.set(150, 150, 100);

function animate() {

    requestAnimationFrame(animate);

    // required if controls.enableDamping or controls.autoRotate are set to true
    controls.update();

    renderer.render(scene, camera);

}

animate();